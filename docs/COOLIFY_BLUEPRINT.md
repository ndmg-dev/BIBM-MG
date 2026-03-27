# Blueprint Executivo: Deploy do B.I no Coolify

Este documento é o mapa final das credenciais e contornos para instanciar a plataforma Dash Casa Brasilis na sua VPS via Coolify, hospedando com sucesso o domínio `https://bimg.nucleodigital.cloud`.

---

## 1. Conectando o Repositório no Coolify
1. Dentro do Coolify Dashboard, vá na aba **Projects**.
2. Adicione uma nova aplicação escolhendo **Docker Compose** (ou conectando este repositório via Github, caso tenha feito push).
3. Especifique o domínio `bimg.nucleodigital.cloud` vinculando-o diretamente à porta mapeada do container Front-end (`3000`).

## 2. Variáveis de Ambiente Globais (Environment Variables)
No Coolify, antes de clicar em `Deploy`, cole EXATAMENTE as seguintes keys de .env em forma de batch no componente Next.js (Frontend):

```env
# URL Root do Frontend na Nuvem
NEXT_PUBLIC_SITE_URL=https://bimg.nucleodigital.cloud

# Conexão Nativa com o Supabase (Database/Auth)
NEXT_PUBLIC_SUPABASE_URL=https://bmmg-supabase.nucleodigital.cloud
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_publica_aqui

# Conexão Interna do NextJS SSR com o Backend FastAPI dockerizado
NEXT_PUBLIC_API_URL=http://backend:8000/api/v1
```

E no componente FastAPI (Backend):
```env
# O Backend usa a chave de Serviço Privada para Bypass RLS (se necessário)
SUPABASE_URL=https://bmmg-supabase.nucleodigital.cloud
SUPABASE_KEY=sua_service_role_key_aqui
```

## 3. Segurança do Google Workspace Auth (Requisito Vital)
Como revisado na Auditoria, o Next.js agora barra qualqer request cujo cookie de sessão Supabase não exista. Para o seu **Supabase Self-hosted** funcionar, vá até sua stack do Supabase no Coolify, navegue nas Env Vars do pacote, e adicione as regras injetadas:

```env
GOTRUE_SITE_URL=https://bimg.nucleodigital.cloud
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=sua_chave_client_id_gerada_no_google
GOTRUE_EXTERNAL_GOOGLE_SECRET=sua_chave_secreta_gerada_no_google
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://bmmg-supabase.nucleodigital.cloud/auth/v1/callback
```
*Observação Final: Lembre-se, o backend FastApi é uma API Oculta e interna; seus endpoints não devem ser expostos na aba Domínio Proxy no Coolify. Somente a interface web Front-end Next3000 recebe o link reverso!*
