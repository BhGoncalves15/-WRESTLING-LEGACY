# Piloto da Carreira Livre

## Como rodar

Requer Node.js 22.13 ou mais recente. Na raiz do repositório:

```bash
npm ci
npm run dev
```

Abra a URL que o Vite mostrar. Clique em **Nova carreira** e, para repetir o cenário de referência, use **Usar exemplo BH**. Após escolher os atributos e os golpes, o mercado apresenta uma proposta de cada empresa do piloto. Assine uma proposta, avance no calendário e escolha suas ações no card. **Salvamentos** permite abrir, salvar, exportar e importar carreiras.

```bash
npm test
npm run build
npx playwright install chromium webkit
PLAYWRIGHT_WEBKIT=1 PLAYWRIGHT_BUILD=1 npm run test:browser
```

No PowerShell, defina as variáveis com `$env:PLAYWRIGHT_WEBKIT = "1"` e `$env:PLAYWRIGHT_BUILD = "1"` antes do último comando. Sem essas variáveis, os testes de navegador usam o servidor de desenvolvimento e executam os perfis desktop e Android de Chromium.

## Escopo entregue

- Criação em três etapas. Identidade, divisão, estilos, alinhamentos, 180 pontos e 20 espaços de golpes.
- Ofertas distintas de NXT, TNA e ROH, pagamentos e bônus fictícios, contraproposta salarial, recusa e nova rodada. Um contrato vencido devolve o lutador ao mercado.
- Agenda das três empresas, resultados dos NPCs, lutas Singles jogáveis, cartel, notícias e histórico. Os shows fora da empresa do jogador são processados ao avançar a data.
- Condição de luta, stamina, momentum, posição, reversões, signatures, finishers, pinfall e submissão. Dificuldade ajusta escolhas da IA e negociação. O OVR é ponderado pelo estilo.
- XP para atributos e golpes. Carteira recebe pagamentos por lutas com vínculo ativo.
- Carreiras independentes, autosave a cada ação confirmada, save manual, exportação, importação e cópia da revisão anterior.

A primeira versão usa um recorte de 33 lutadores, com divisões masculina e feminina. Campeonatos apresenta referências históricas de abertura. Disputas por títulos, torneios, contratos de NPCs, elencos completos, relações, Carreira História, novas estipulações e renovação dos elencos de longo prazo pertencem às etapas D–G.

## Motores e salvamentos

`src/domain/model.ts` define os modelos versionados. `src/content` guarda o catálogo histórico inicial e os golpes. `src/engine` processa as decisões sem depender da interface. Para cada avanço, o calendário resolve as datas em ordem, guarda os resultados de NPCs e pausa quando há uma luta do jogador. O motor de Singles valida a ação, calcula iniciativa, aplica efeitos e exige uma condição válida de término. O estado da semente acompanha a carreira.

`src/storage` valida tanto a estrutura como referências de eventos, participantes, resultados e pagamentos. IndexedDB grava a revisão atual e a cópia anterior na mesma transação. Quando a revisão muda em outra aba, reabra a carreira. O arquivo JSON usa a versão 1. Importar cria um save separado com outro ID. Versões de formato e de catálogo precisam de migrações explícitas quando forem introduzidas. Os perfis de navegador usam armazenamentos independentes.

## Pesquisa histórica e arte

- O recorte parte de aparições oficiais de dezembro de 2025. O arquivo `src/content/catalog.ts` associa a data e a URL a cada perfil. A elegibilidade do piloto deriva desse recorte. Termos de contrato, estilos, alinhamentos, atributos e OVR são parâmetros da simulação.
- A programação anunciada preserva iMPACT! de 1º e 15 de janeiro, New Year’s Evil de 6 de janeiro e Genesis de 17 de janeiro. Programas semanais gerados pelo jogo recebem identificação na agenda. Cards e resultados são simulados.
- A seção Campeonatos distingue títulos conhecidos no recorte dos que surgiram depois. A pesquisa completa das sete empresas, do catálogo de 71 títulos e da cobertura até 12/11/2026 segue no roteiro do [README](../README.md).
- `public/art/arena.webp` é uma ilustração original gerada para o jogo, com lutador anônimo visto de costas, ringue e luzes de arena. A interface identifica a ilustração. Fotos de lutadores, logos das promoções e designs históricos de cinturões aguardam verificação de direitos.
