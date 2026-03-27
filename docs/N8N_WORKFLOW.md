# Guia: Fluxo n8n para Upload de D.R.E.

## Visão Geral
Este fluxo permite que um usuário envie um arquivo `.xlsx` de D.R.E. por qualquer canal (WhatsApp, Telegram, E-mail, Formulário Web) e o n8n processe automaticamente o upload via API, criando ou identificando a empresa no banco de dados.

---

## Endpoint de Destino

```
POST https://bimg.nucleodigital.cloud/api/v1/imports/dre
Content-Type: multipart/form-data

Campos obrigatórios:
  - file        → arquivo .xlsx binário
  - company_name → nome da empresa (ex: "Casa Brasilis Marine")
```

---

## Arquitetura do Fluxo

```
[Trigger]
    ↓
[Receber Arquivo]
    ↓
[HTTP Request → POST /imports/dre]
    ↓
[Tratar Resposta]
    ↓
[Notificar Usuário]
```

---

## Configuração Node a Node

### Node 1 — Trigger
Escolha conforme o canal:
- **Webhook** → para formulário web ou chamada externa
- **Telegram Trigger** → se o arquivo for enviado via Telegram
- **Email Trigger (IMAP)** → se vier por e-mail com anexo

---

### Node 2 — HTTP Request (o mais importante)

| Campo | Valor |
|-------|-------|
| Method | `POST` |
| URL | `https://bimg.nucleodigital.cloud/api/v1/imports/dre` |
| Body Content Type | `Form-Data (Multipart)` |

**Campos do Body:**

| Name | Value | Type |
|------|-------|------|
| `file` | `{{ $binary.data }}` (ou o campo binário do trigger) | File/Binary |
| `company_name` | `{{ $json.company_name }}` ou valor fixo | Text |

> **Exemplo com valor fixo:** Se o fluxo é dedicado a uma única empresa, você pode deixar `company_name` como texto fixo: `Casa Brasilis Marine`.

---

### Node 3 — IF (Verificar Sucesso)

Condição: `{{ $json.total_records_saved }}` **>** `0`

- **True** → Sucesso
- **False** → Erro

---

### Node 4a — Respond / Notificar Sucesso

Mensagem de retorno:
```
✅ Planilha importada com sucesso!
Empresa: {{ $json.message }}
Registros salvos: {{ $json.total_records_saved }}
```

### Node 4b — Notificar Erro

```
❌ Erro ao importar a planilha. Verifique se o arquivo está no padrão correto (.xlsx).
```

---

## Segurança

- Se quiser proteger o endpoint contra uso indevido no n8n, você pode adicionar um **Header** de autenticação no Node de HTTP Request e implementar uma chave de API simples no FastAPI. Fale comigo se quiser isso no futuro.

---

## Teste Manual (sem n8n)

Você pode testar o endpoint direto pelo terminal ou pelo Swagger em:
```
https://bimg.nucleodigital.cloud/api/v1/docs
```

Ou via curl:
```bash
curl -X POST https://bimg.nucleodigital.cloud/api/v1/imports/dre \
  -F "file=@planilha.xlsx" \
  -F "company_name=Casa Brasilis Marine"
```
