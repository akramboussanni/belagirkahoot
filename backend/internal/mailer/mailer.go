package mailer

import (
	"bytes"
	"crypto/tls"
	"embed"
	"fmt"
	"html/template"
	"log"
	"mime"
	"net"
	"net/smtp"
	"strings"
	"time"
)

//go:embed templates/*.html
var templateFS embed.FS

type Mailer struct {
	Host string
	Port string
	User string
	Pass string
	From string
	tmpl *template.Template
}

func New(host, port, user, pass, from string) *Mailer {
	tmpl, err := template.ParseFS(templateFS, "templates/*.html")
	if err != nil {
		log.Printf("Warning: failed to parse email templates: %v", err)
	}

	return &Mailer{
		Host: host,
		Port: port,
		User: user,
		Pass: pass,
		From: from,
		tmpl: tmpl,
	}
}

func (m *Mailer) SendEmail(to []string, subject, body string) error {
	// Fallback to simple text email
	return m.send(to, subject, body, "text/plain; charset=\"utf-8\"")
}

func (m *Mailer) SendTemplateEmail(to []string, subject, templateName string, data interface{}) error {
	if m.tmpl == nil {
		return fmt.Errorf("email templates not initialized")
	}

	var body bytes.Buffer
	if err := m.tmpl.ExecuteTemplate(&body, templateName, data); err != nil {
		return fmt.Errorf("failed to execute template %s: %w", templateName, err)
	}

	return m.send(to, subject, body.String(), "text/html; charset=\"utf-8\"")
}

func (m *Mailer) send(to []string, subject, body, contentType string) error {
	if m.Host == "" || m.Port == "" {
		log.Printf("SMTP not configured, skip sending email to %v (Subject: %s)", to, subject)
		return nil
	}

	var auth smtp.Auth
	if m.User != "" && m.Pass != "" {
		auth = smtp.PlainAuth("", m.User, m.Pass, m.Host)
	}

	addr := m.Host + ":" + m.Port

	// Setup proper MIME email headers
	header := make(map[string]string)
	header["From"] = m.From
	header["To"] = strings.Join(to, ", ")
	header["Subject"] = mime.QEncoding.Encode("utf-8", subject)
	header["MIME-Version"] = "1.0"
	header["Content-Type"] = contentType

	var msgBuf bytes.Buffer
	for k, v := range header {
		msgBuf.WriteString(fmt.Sprintf("%s: %s\r\n", k, v))
	}
	msgBuf.WriteString("\r\n")
	msgBuf.WriteString(body)

	timeout := 15 * time.Second
	dialer := &net.Dialer{Timeout: timeout}

	var conn net.Conn
	var err error

	if m.Port == "465" {
		// SMTPS (Implicit TLS) is required for port 465
		conn, err = tls.DialWithDialer(dialer, "tcp", addr, &tls.Config{ServerName: m.Host})
	} else {
		// Standard connection for ports like 587 or 25
		conn, err = dialer.Dial("tcp", addr)
	}

	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}
	defer conn.Close()

	// Enforce the timeout for the entire duration of the connection
	if err := conn.SetDeadline(time.Now().Add(timeout)); err != nil {
		return fmt.Errorf("failed to set deadline: %w", err)
	}

	client, err := smtp.NewClient(conn, m.Host)
	if err != nil {
		return fmt.Errorf("smtp client creation failed: %w", err)
	}
	defer client.Close()

	// Upgrade connection to TLS if using STARTTLS (usually port 587)
	if m.Port != "465" {
		if ok, _ := client.Extension("STARTTLS"); ok {
			config := &tls.Config{ServerName: m.Host}
			if err = client.StartTLS(config); err != nil {
				return fmt.Errorf("STARTTLS failed: %w", err)
			}
		}
	}

	// Authenticate
	if auth != nil {
		if err = client.Auth(auth); err != nil {
			return fmt.Errorf("authentication failed: %w", err)
		}
	}

	// Send email transactions
	if err = client.Mail(m.From); err != nil {
		return fmt.Errorf("sender address rejected: %w", err)
	}
	for _, rec := range to {
		if err = client.Rcpt(rec); err != nil {
			return fmt.Errorf("recipient address rejected: %w", rec, err)
		}
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("data command failed: %w", err)
	}

	if _, err = w.Write(msgBuf.Bytes()); err != nil {
		return fmt.Errorf("writing message failed: %w", err)
	}

	if err = w.Close(); err != nil {
		return fmt.Errorf("closing message failed: %w", err)
	}

	if err = client.Quit(); err != nil {
		log.Printf("failed to send email gracefully: %v", err)
	}

	log.Printf("email sent successfully to %v", to)
	return nil
}
