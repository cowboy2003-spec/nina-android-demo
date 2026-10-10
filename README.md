# NINA — demonstração visual Android

Protótipo **público, fictício e independente** da NINA privada. Não utiliza IA, autenticação, dados pessoais, memória real, microfone nem APIs.

O código de apresentação foi copiado exclusivamente de `demo/` do repositório NINA, PR #26. O build compila dois módulos TypeScript e publica apenas seis ficheiros estáticos em `dist/`. A Vercel serve `dist/`; `vercel.json` aplica os cabeçalhos de segurança.

## Publicar na Vercel

Importar **apenas este repositório** como projeto novo. Não adicionar variáveis de ambiente, integrações, funções, rewrites ou domínio da NINA privada. Confirmar que o framework é `Other`, o comando de build é `npm run build` e o output é `dist`. Após o deployment, verificar HTTPS, os cabeçalhos e que `/api/nina/status` e `/nina/review` devolvem 404. Não introduzir dados reais.
