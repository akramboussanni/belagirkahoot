package mailer

import (
	"bytes"
	"embed"
	"fmt"
	"html/template"
	"log"
	"strconv"

	"gopkg.in/gomail.v2"
)

//go:embed templates/*.html
var templateFS embed.FS

type Mailer struct {
	From   string
	dialer *gomail.Dialer
	tmpl   *template.Template
}

func New(host, portStr, user, pass, from string) *Mailer {
	tmpl, err := template.ParseFS(templateFS, "templates/*.html")
	if err != nil {
		log.Printf("Warning: failed to parse email templates: %v", err)
	}

	port, _ := strconv.Atoi(portStr)
	if port == 0 {
		port = 587 // default
	}

	dialer := gomail.NewDialer(host, port, user, pass)

	return &Mailer{
		From:   from,
		dialer: dialer,
		tmpl:   tmpl,
	}
}

func (m *Mailer) SendEmail(to []string, subject, body string) error {
	msg := gomail.NewMessage()
	msg.SetHeader("From", m.From)
	msg.SetHeader("To", to...)
	msg.SetHeader("Subject", subject)
	msg.SetBody("text/plain", body)

	if err := m.dialer.DialAndSend(msg); err != nil {
		log.Printf("failed to send plain email: %v", err)
		return err
	}

	log.Printf("email sent successfully to %v", to)
	return nil
}

func (m *Mailer) SendTemplateEmail(to []string, subject, templateName string, data interface{}) error {
	if m.tmpl == nil {
		return fmt.Errorf("email templates not initialized")
	}

	var body bytes.Buffer
	if err := m.tmpl.ExecuteTemplate(&body, templateName, data); err != nil {
		return fmt.Errorf("failed to execute template %s: %w", templateName, err)
	}

	msg := gomail.NewMessage()
	msg.SetHeader("From", m.From)
	msg.SetHeader("To", to...)
	msg.SetHeader("Subject", subject)
	msg.SetBody("text/html", body.String())

	if err := m.dialer.DialAndSend(msg); err != nil {
		log.Printf("failed to send template email: %v", err)
		return err
	}

	log.Printf("email sent successfully to %v", to)
	return nil
}
