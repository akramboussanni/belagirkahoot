package mailer

import (
	"bytes"
	"crypto/tls"
	"embed"
	"fmt"
	"html/template"
	"log"
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

	// Setup message
	msg := []byte(fmt.Sprintf("From: %s\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"Content-Type: %s\r\n"+
		"\r\n"+
		"%s\r\n", m.From, strings.Join(to, ","), subject, contentType, body))

	errChan := make(chan error, 1)
	go func() {
		if m.Port == "465" {
			// SMTPS (Implicit TLS) is required for port 465
			tlsconfig := &tls.Config{
				InsecureSkipVerify: false,
				ServerName:         m.Host,
			}
			conn, err := tls.Dial("tcp", addr, tlsconfig)
			if err != nil {
				errChan <- fmt.Errorf("tls.Dial failed: %w", err)
				return
			}
			defer conn.Close()

			client, err := smtp.NewClient(conn, m.Host)
			if err != nil {
				errChan <- fmt.Errorf("smtp.NewClient failed: %w", err)
				return
			}
			defer client.Close()

			if auth != nil {
				if err = client.Auth(auth); err != nil {
					errChan <- fmt.Errorf("client.Auth failed: %w", err)
					return
				}
			}

			if err = client.Mail(m.From); err != nil {
				errChan <- fmt.Errorf("client.Mail failed: %w", err)
				return
			}
			for _, rec := range to {
				if err = client.Rcpt(rec); err != nil {
					errChan <- fmt.Errorf("client.Rcpt failed: %w", err)
					return
				}
			}

			w, err := client.Data()
			if err != nil {
				errChan <- fmt.Errorf("client.Data failed: %w", err)
				return
			}

			_, err = w.Write(msg)
			if err != nil {
				errChan <- fmt.Errorf("write msg failed: %w", err)
				return
			}

			err = w.Close()
			if err != nil {
				errChan <- fmt.Errorf("close writer failed: %w", err)
				return
			}

			errChan <- client.Quit()
		} else {
			// Standard SMTP with STARTTLS (port 587 or 25)
			errChan <- smtp.SendMail(addr, auth, m.From, to, msg)
		}
	}()

	var err error
	select {
	case err = <-errChan:
		// Completed within timeout
	case <-time.After(15 * time.Second):
		err = fmt.Errorf("timeout (15s): connection to %s hung. Port %s might be blocked by your server/VPS firewall", addr, m.Port)
	}

	if err != nil {
		log.Printf("failed to send email: %v", err)
		return err
	}

	log.Printf("email sent successfully to %v", to)
	return nil
}
