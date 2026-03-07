package mailer

import (
	"bytes"
	"embed"
	"fmt"
	"html/template"
	"log"
	"net/smtp"
	"strings"
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
	msg := []byte(fmt.Sprintf("From: %s\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"Content-Type: %s\r\n"+
		"\r\n"+
		"%s\r\n", m.From, strings.Join(to, ","), subject, contentType, body))

	err := smtp.SendMail(addr, auth, m.From, to, msg)
	if err != nil {
		log.Printf("failed to send email: %v", err)
		return err
	}

	log.Printf("email sent successfully to %v", to)
	return nil
}
