import Link from "next/link";

// Página 404 amigável: qualquer endereço inexistente (bookmark/atalho antigo no celular)
// cai aqui com um botão pra voltar ao login, em vez do 404 cru do Next.
export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        textAlign: "center",
        background: "#FBF9F4",
        fontFamily: "-apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
      }}
    >
      <div style={{ fontSize: 48 }}>🐾</div>
      <h1 style={{ color: "#014D5E", fontSize: 20, margin: 0 }}>Página não encontrada</h1>
      <p style={{ color: "#5C6B70", fontSize: 14, maxWidth: 340, margin: 0, lineHeight: 1.5 }}>
        O endereço que você abriu não existe ou mudou de lugar. Volte para o início para entrar no sistema.
      </p>
      <Link
        href="/"
        style={{
          background: "#009AAC",
          color: "#fff",
          padding: "11px 22px",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Ir para o início
      </Link>
    </div>
  );
}
