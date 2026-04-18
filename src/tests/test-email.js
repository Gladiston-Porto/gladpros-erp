// Script de teste para verificar configuração SMTP
const nodemailer = require("nodemailer");
require("dotenv").config({ path: "./.env" });

console.log("=== CONFIGURAÇÕES SMTP ===");
console.log("SMTP_HOST:", process.env.SMTP_HOST);
console.log("SMTP_PORT:", process.env.SMTP_PORT);
console.log("SMTP_SECURE:", process.env.SMTP_SECURE);
console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("SMTP_PASS:", process.env.SMTP_PASS ? "***configurada***" : "não configurada");
console.log("SMTP_FROM:", process.env.SMTP_FROM);

async function testSMTP() {
  if (!process.env.SMTP_HOST) {
    console.error("❌ SMTP_HOST não configurado!");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    } : undefined,
    // Adicionar debug
    debug: true,
    logger: true
  });

  try {
    console.log("\n=== VERIFICANDO CONEXÃO SMTP ===");
    await transporter.verify();
    console.log("✅ Conexão SMTP verificada com sucesso!");

    console.log("\n=== ENVIANDO EMAIL DE TESTE ===");
    const testEmail = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER, // Enviando para o próprio remetente como teste
      subject: "Teste de Email - GladPros",
      html: `
        <h2>Email de Teste</h2>
        <p>Se você recebeu este email, a configuração SMTP está funcionando corretamente.</p>
        <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      `,
      text: "Email de teste - Se você recebeu este email, a configuração SMTP está funcionando."
    };

    const info = await transporter.sendMail(testEmail);
    console.log("✅ Email enviado com sucesso!");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);
    
    if (info.accepted && info.accepted.length > 0) {
      console.log("✅ Email aceito pelo servidor:", info.accepted);
    }
    
    if (info.rejected && info.rejected.length > 0) {
      console.log("❌ Email rejeitado:", info.rejected);
    }

  } catch (error) {
    console.error("❌ Erro no teste SMTP:");
    console.error("Tipo:", error.code || "Desconhecido");
    console.error("Mensagem:", error.message);
    
    if (error.code === "EAUTH") {
      console.log("💡 Sugestão: Verificar credenciais SMTP_USER e SMTP_PASS");
    } else if (error.code === "ECONNECTION") {
      console.log("💡 Sugestão: Verificar SMTP_HOST e SMTP_PORT");
    } else if (error.code === "ETIMEDOUT") {
      console.log("💡 Sugestão: Verificar se a porta está bloqueada pelo firewall");
    }
  }
}

testSMTP().catch(console.error);
