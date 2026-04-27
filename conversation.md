Entendi o fluxo principal. Hoje o app tem dois caminhos bem separados:

1. Logado = modo completo
A sessão vem de services.userSession.getOrCreate() / account/session.ts. Se user.id existe, o app busca organizações, plano e permissões na API da Insomnia:
organization._index.tsx (line 12)

Esse caminho libera rotas normais de organização/projeto, porque várias loaders exigem sessão:
organization.$organizationId.project._index.tsx (line 37)

2. Sem login = Scratch Pad limitado
O Scratch Pad é criado no startup como projeto/workspace local fixo:
entry.main.ts (line 302)

O botão “Use local Scratch Pad” manda direto para:
/organization/org_scratchpad/project/proj_scratchpad/workspace/wrk_scratchpad/debug
auth.login.tsx (line 154)

E ele é limitado de propósito nas storage rules:
organization-storage-rules.ts (line 22)

enableCloudSync: false
enableLocalVault: true
enableGitSync: false
Além disso, criar projeto exige login mesmo para local:
organization.$organizationId.project.new.tsx (line 56)

Conclusão
Para uma versão própria “sem login para recursos gratuitos”, o caminho correto não é fingir sessão, porque Cloud Sync, organizações reais, plano, permissões e alguns recursos dependem da API backend da Insomnia. O caminho saudável é criar um modo local completo:

usar uma “organização local” padrão em vez de só org_scratchpad;
permitir criar múltiplos projetos Local Vault sem sessão;
liberar Git Sync local se a implementação não depender da API de conta para aquele fluxo;
manter Cloud Sync, colaboração, billing, organizações remotas e APIs da Insomnia atrás de login real;
ajustar loaders que hoje redirecionam para /auth/login.
Os principais pontos para alterar seriam organization._index.tsx, organization.$organizationId.project._index.tsx, organization.$organizationId.project.new.tsx, organization-storage-rules.ts, auth.login.tsx e possivelmente utils/router.ts.

Irei implementar a primeira versão: “modo local completo sem login”, com criação/listagem de projetos Local Vault fora do Scratch Pad.


45 previous messages
Implementei o modo local completo sem login.

Agora, sem sessão, o app entra em uma organização local org_local em vez de cair só no Scratch Pad. Nessa organização:

dá para criar e abrir projetos Local Vault sem login;
Git Sync fica habilitado para o modo local;
Cloud Sync continua desabilitado offline, porque depende da API/conta da Insomnia;
as rotas de organização/projeto não redirecionam mais para /auth/login quando o organizationId é local/offline.
Principais arquivos alterados:
organization.ts, organization._index.tsx, organization-storage-rules.ts, organization.$organizationId.project.new.tsx, auth.login.tsx.

Validação:

npm run lint -w packages/insomnia passou.
npx tsc --project packages/insomnia/tsconfig.json --noEmit passou.
npm test -w packages/insomnia passou: 101 arquivos, 1670 testes.
npm run type-check -w packages/insomnia ficou bloqueado no react-router typegen porque packages/insomnia/.react-router/types está com arquivos pertencendo a root; tentei corrigir ownership, mas o macOS retornou Operation not permitted. O tsc direto passou contra os tipos existentes.
13 files changed
+85
-39
Undo

Review
packages/insomnia/src/models/organization.ts
packages/insomnia/src/common/organization-storage-rules.ts
packages/insomnia/src/routes/organization.tsx
packages/insomnia/src/routes/organization._index.tsx
packages/insomnia/src/utils/router.ts
packages/insomnia/src/routes/auth.login.tsx
packages/insomnia/src/routes/organization.$organizationId.project._index.tsx
packages/insomnia/src/routes/organization.$organizationId.project.new.tsx
packages/insomnia/src/routes/organization.$organizationId.permissions.tsx
packages/insomnia/src/routes/untracked-projects.tsx
packages/insomnia/src/routes/commands.tsx
packages/insomnia/src/ui/organization-utils.ts
packages/insomnia/src/routes/organization.$organizationId.project.$projectId._index.tsx




