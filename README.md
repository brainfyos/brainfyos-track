# BrainfyOS Track

# GroupLens — Análise Inteligente de Grupos WhatsApp

**Documento de Projeto v1.0 — Fevereiro 2026**

---

## 1. Visão Geral

### O Problema

Em grupos de mentoria no WhatsApp, o volume de mensagens é alto e a maior parte é conversa casual. Dúvidas relevantes se perdem no ruído, respostas valiosas da comunidade ficam enterradas, e o gestor não tem visibilidade sobre o que está acontecendo sem ler centenas de mensagens manualmente.

### A Solução

Plataforma que conecta a grupos do WhatsApp via Evolution API, armazena todas as mensagens e utiliza IA para filtrar, categorizar e resumir o que realmente importa. O gestor vê rapidamente as dúvidas relevantes agrupadas por contexto, as respostas da comunidade, e pode usar qualquer discussão como contexto para gerar respostas assistidas por IA.

### Público-Alvo

Gestores de comunidades e mentorias que administram grupos no WhatsApp e precisam de visibilidade rápida sobre discussões relevantes.

### Proposta de Valor

- De horas lendo mensagens para minutos analisando resumos

- Nenhuma dúvida relevante se perde — a IA identifica e categoriza automaticamente

- Respostas da comunidade rastreadas — quem ajudou e qual foi a conclusão

- Chat com contexto — usar discussões reais como base para gerar respostas com IA

---

## 2. Funcionalidades

### 2.1 Conexão com WhatsApp

**Instância Mãe (Admin)** — Configuração exclusiva do administrador da organização. A instância mãe é a conexão principal com o WhatsApp via Evolution API e é responsável por toda a coleta de mensagens. Ela opera com webhook padrão, recebendo todas as mensagens dos grupos monitorados em tempo real e armazenando no banco. A descoberta de grupos disponíveis também é feita a partir dessa instância. Ter uma única instância de coleta evita duplicação de mensagens no banco de dados — independente de quantos usuários estejam na organização, cada mensagem é registrada apenas uma vez.

**Instância do Usuário (Envio)** — Cada usuário da organização pode conectar sua própria instância Evolution API, mas ela tem um papel diferente: é utilizada exclusivamente para o envio de mensagens. Quando o usuário finaliza uma resposta no chat com contexto e decide enviá-la ao grupo, a mensagem é disparada pela instância pessoal do usuário, não pela instância mãe.

**Usuário sem Presença no Grupo** — É possível que um usuário da organização tenha acesso à análise de um grupo (via instância mãe) mas não seja participante desse grupo no WhatsApp. Nesses casos, o envio de mensagens fica indisponível. O sistema trata isso com dois elementos visuais: uma tag no card do grupo indicando "Você não está neste grupo" e uma notificação de aviso caso o usuário tente enviar uma mensagem, explicando que precisa estar no grupo para enviar. A verificação de presença é feita via endpoints da Evolution API (participantes do grupo vs número conectado na instância do usuário).

**Descoberta e Seleção de Grupos** — A listagem de grupos disponíveis é feita via GET na instância mãe. A partir dessa lista, o administrador seleciona quais grupos deseja monitorar. Somente os grupos selecionados passam a ter suas mensagens processadas e disponíveis para análise por todos os membros da organização.

### 2.2 Análise Inteligente de Mensagens

**Filtragem por Relevância** — Funcionalidade central. Ao acionar a análise, a IA processa todas as mensagens do período selecionado e separa o que é útil do que é ruído. O filtro opera com base em um system prompt padrão, mas também permite regras adicionais configuráveis. No contexto de mentoria, o objetivo principal é identificar dúvidas relevantes e descartar conversas casuais.

**Agrupamento por Contexto** — As dúvidas identificadas como relevantes são agrupadas por tema. Se duas ou mais dúvidas tratam do mesmo assunto, aparecem juntas em um único bloco. Cada grupo de contexto exibe um resumo gerado pela IA, permitindo entender rapidamente o tema sem ler todas as mensagens.

**Respostas da Comunidade** — Quando alguém do grupo fornece uma resposta útil a uma dúvida, o sistema identifica essa interação. Na visualização, aparece quem respondeu e qual foi a conclusão resumida pela IA. Isso permite saber quais dúvidas já foram resolvidas pela própria comunidade e reconhecer membros ativos.

**Visualização de Mensagens Originais** — Cada bloco de análise é clicável. Ao expandir, o usuário visualiza o fluxo completo das mensagens originais que compõem aquela discussão — já filtradas, mostrando apenas as que fazem parte daquele contexto específico.

### 2.3 Chat com Contexto de Discussão

**Gerar Resposta a partir de Discussão** — Qualquer discussão identificada na análise pode ser usada como contexto para um chat com IA. O usuário seleciona a discussão e é direcionado para uma interface de chat onde toda aquela conversa é injetada como contexto. A partir daí, pode dialogar com a IA para construir uma resposta elaborada ou explorar o tema.

**Envio Direto ao Grupo** — Ao chegar na conclusão da resposta via chat, o usuário pode enviá-la diretamente ao grupo do WhatsApp. O envio é feito pela instância pessoal do usuário (não pela instância mãe). Caso o usuário não seja participante do grupo, o botão de envio fica desabilitado e uma notificação explica o motivo.

**Seleção de Modelo** — Dentro do chat, o usuário escolhe qual modelo da Anthropic utilizar. A conexão é configurada nas definições (API Key). Diferente das funções de análise que usam integração nativa do Lovable, o chat permite escolher entre diferentes modelos disponíveis.

### 2.4 Organizações e Multiusuários

**Sistema de Organizações** — O usuário cria uma organização e convida outros usuários. Cada organização funciona como um workspace isolado onde membros compartilham acesso aos grupos monitorados e às análises geradas.

**Instâncias por Usuário** — Cada usuário configura sua própria instância de conexão nas definições, utilizada exclusivamente para envio de mensagens aos grupos. A instância mãe (coleta) é gerenciada apenas pelo administrador da organização. Isso garante separação clara: uma fonte única de dados e múltiplos canais de envio.

### 2.5 Configurações e Regras

**Regras de Análise Customizáveis** — Além do system prompt padrão, o usuário pode adicionar regras específicas para refinar o que a IA considera relevante. Exemplos: ignorar mensagens de bom dia, focar apenas em dúvidas técnicas, destacar pedidos de ajuda.

**Integração Anthropic** — O usuário insere sua API Key da Anthropic nas configurações. Essa chave é utilizada exclusivamente na funcionalidade de chat com contexto. As funções de análise automática operam com a integração nativa do sistema.

---

## 3. Mapa de Telas

### 3.1 Dashboard — Meus Grupos

Tela inicial após login. Exibe todos os grupos monitorados com indicadores rápidos de atividade.

|Componente|Descrição|

|---|---|

|Header da página|Título "Meus Grupos", botão de adicionar novo grupo e campo de busca|

|Cards de grupo|Nome, foto, mensagens desde a última análise, data da última análise, badge de status. Tag "Você não está neste grupo" quando o usuário não é participante|

|Indicadores rápidos|Total de mensagens novas, dúvidas pendentes, total de grupos monitorados|

|Ação no card|Clicar direciona para a Tela de Análise (3.2) do grupo|

|Estado vazio|Orientação para adicionar grupo via Tela de Seleção (3.6)|

### 3.2 Análise do Grupo — Tela Principal

Página central do sistema. Exibe os resultados da análise inteligente. Todas as informações são resumos gerados pela IA.

|Componente|Descrição|

|---|---|

|Header do grupo|Nome, foto, período analisado e botão "Gerar Análise"|

|Filtro de período|Seletor de data — opções rápidas: hoje, últimos 7 dias, últimos 30 dias, personalizado|

|Seção de contextos|Blocos agrupados por tema com título gerado pela IA, resumo das dúvidas e quantidade de mensagens|

|Badge de resposta|Indicador visual se a dúvida foi respondida pela comunidade, com nome e conclusão resumida|

|Botão expandir|Revela mensagens originais filtradas daquele contexto (ver 3.3)|

|Botão "Chat com contexto"|Disponível em cada bloco, redireciona para o Chat (3.4) com a discussão como contexto|

|Estado sem análise|Orientação para clicar em "Gerar Análise" com explicação do processo|

|Loading de análise|Feedback de progresso: coletando mensagens → filtrando → agrupando → gerando resumos|

### 3.3 Mensagens Originais — Detalhe da Discussão

Visão expandida de um bloco de contexto. Exibe o fluxo real de mensagens já filtradas pela IA.

|Componente|Descrição|

|---|---|

|Header de contexto|Título do contexto e resumo da IA no topo|

|Thread de mensagens|Formato de chat com nome do remetente, horário e conteúdo — apenas mensagens relevantes|

|Destaque de resposta|Mensagem de resposta com destaque visual diferenciado como conclusão identificada|

|Navegação|Botão voltar à análise e botão para abrir chat com contexto|

### 3.4 Chat com Contexto — Assistente IA

Interface de chat onde a discussão selecionada é injetada como contexto.

|Componente|Descrição|

|---|---|

|Painel de contexto|Barra lateral/superior com a discussão usada como contexto, resumo e opção de expandir|

|Seletor de modelo|Dropdown com modelos disponíveis da Anthropic baseado na API Key configurada|

|Área de chat|Interface padrão com histórico, campo de input e botão enviar|

|Ações na resposta|Copiar, exportar ou enviar resposta diretamente ao grupo via instância do usuário|

|Estado sem presença|Se o usuário não está no grupo, botão de envio desabilitado com notificação explicativa|

### 3.5 Configurações

Página de configurações gerais dividida em seções.

|Componente|Descrição|

|---|---|

|Seção Instância Mãe (admin)|Visível apenas para administradores. URL do servidor, API Key, nome da instância principal de coleta. Botão testar conexão e status. Esta instância é responsável por receber todas as mensagens dos grupos|

|Seção Minha Instância (usuário)|Cada usuário configura sua instância pessoal para envio de mensagens. URL, API Key, nome. Botão testar e status|

|Seção Anthropic|Campo API Key, botão validar e listar modelos disponíveis|

|Seção Regras de Análise|System prompt padrão (read-only) + editor de regras complementares com exemplos pré-definidos|

|Seção Organização|Nome, lista de membros com papéis e convite por e-mail|

### 3.6 Seleção de Grupos — Adicionar Grupo

Tela para descobrir e adicionar grupos ao monitoramento. A listagem vem da instância mãe.

|Componente|Descrição|

|---|---|

|Lista de grupos|GET na instância mãe para listar grupos disponíveis — nome, foto, participantes|

|Filtro e busca|Campo de busca por nome e filtro para ocultar grupos já monitorados|

|Botão adicionar|Cada grupo tem botão para ativar monitoramento via webhook|

|Confirmação|Feedback de sucesso e opção de ir direto para a Análise do grupo|

### 3.7 Gestão da Organização

Administração da organização e membros.

|Componente|Descrição|

|---|---|

|Dados da organização|Nome, descrição, data de criação — editável pelo admin|

|Lista de membros|Nome, e-mail, papel (admin/membro), data de entrada, status|

|Convite|Campo de e-mail para enviar convites com link|

|Gerência de papéis|Promover a admin ou remover da organização|

---

## 4. Fluxos Principais

### 4.1 Primeiro Acesso

1. Criar conta e fazer login

2. **(Admin)** Acessar Configurações e criar a instância mãe Evolution API (URL + API Key)

3. Testar a conexão da instância mãe e confirmar que está ativa

4. Ir para Seleção de Grupos e escolher quais monitorar

5. **(Usuário)** Configurar instância pessoal para envio de mensagens

6. Retornar ao Dashboard e acessar o grupo

7. Clicar em "Gerar Análise" e visualizar resultados

### 4.2 Uso Recorrente — Análise Diária

1. Abrir Dashboard e identificar grupos com mensagens novas

2. Selecionar grupo e definir período (ex: últimas 24h)

3. Gerar análise e navegar pelos blocos de contexto

4. Verificar quais dúvidas foram respondidas pela comunidade

5. Para dúvidas pendentes, abrir chat com contexto e elaborar resposta

6. Enviar resposta diretamente ao grupo (via instância pessoal) ou copiar

### 4.3 Chat com Contexto

1. Na tela de análise, identificar uma discussão que precisa de atenção

2. Clicar em "Chat com contexto" no bloco

3. Selecionar o modelo desejado

4. Conversar com a IA usando a discussão como base

5. Enviar resposta ao grupo (se estiver no grupo) ou copiar/exportar

---

## 5. Regras de Análise — Exemplos Padrão

O sistema vem com regras pré-configuradas para o contexto de grupos de mentoria. O usuário pode customizar conforme necessidade.

**Regras padrão sugeridas:**

- Identificar mensagens que contenham perguntas ou pedidos de ajuda

- Descartar mensagens de saudação (bom dia, boa tarde, etc.)

- Descartar mensagens puramente sociais sem conteúdo técnico ou de aprendizado

- Agrupar dúvidas que tratem do mesmo tema ou ferramenta

- Identificar quando alguém oferece uma resposta concreta a uma dúvida

- Marcar como "respondida" quando a conclusão é clara

- Preservar o nome do autor da pergunta e do autor da resposta

---

## 6. Navegação Geral

```

Login

 └── Dashboard (Meus Grupos)

      ├── Análise do Grupo

      │    ├── Mensagens Originais (expandir bloco)

      │    └── Chat com Contexto → Enviar ao Grupo

      ├── Seleção de Grupos (adicionar — via instância mãe)

      └── Configurações

           ├── Instância Mãe (admin only)

           ├── Minha Instância (envio)

           ├── API Key Anthropic

           ├── Regras de Análise

           └── Gestão da Organização

```

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4c501147-875f-47f4-9bc8-95bf30f94c79).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
