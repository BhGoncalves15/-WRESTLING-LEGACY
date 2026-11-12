# Wrestling Legacy

Simulador de carreira de wrestling profissional para computador e celular. Você cria um lutador e toma as decisões dele. Lutadores, cards e empresas são administrados pela simulação.

## Escopo aprovado

- Carreira a partir de 1º de janeiro de 2026. Cadastro histórico com cobertura até 12 de novembro de 2026. Cada carreira tem seu próprio universo a partir da data inicial.
- Escopo final com WWE Raw, SmackDown e NXT, AEW, NJPW, TNA, AAA, ROH e BWF. O piloto da Carreira Livre usa NXT, TNA e ROH. Carreira História será adicionada na etapa G.
- Três propostas iniciais, negociação e calendário. Criação com seis estilos, nove atributos e 20 espaços de golpes. Balanceamento inicial com 40 por atributo, 180 distribuíveis, 90 de limite inicial e 100 de teto evolutivo.
- XP evolui atributos e golpes. A economia da carreira tem registro próprio. Os três níveis de dificuldade usam o mesmo OVR base. Lesões geradas pela simulação ficam desativadas.
- Combates por turnos. Singles no piloto, com expansão para as 29 estipulações do Documento Mestre. O resultado depende das regras da luta e das decisões de cada lutador.
- Catálogo de referência de 72 entradas para 71 títulos, com o AAA World Cruiserweight Championship compartilhando a identidade nas listas WWE e AAA. Regras próprias para elegibilidade, linhagem, unificações, designs e torneios.
- Múltiplas carreiras com autosave, save manual, exportação, importação e recuperação local. As páginas refletem o estado salvo da carreira.

## Arquitetura

- React e TypeScript na interface. Vite gera o site estático para o caminho do repositório em GitHub Pages.
- Motores de combate e carreira separados da interface. Calendário, ações e estado da semente determinam a sequência simulada.
- Identidades estáveis para pessoas, aparições, vínculos, eventos e títulos. Catálogo histórico versionado e estado da carreira por save.
- IndexedDB com gravações transacionais, revisões, uma cópia da revisão anterior e validação de importação.
- Vitest para regras e integração do motor. Playwright para jornadas no navegador e perfis móveis.

## Roteiro

| Etapa | Entrega e critério de aceite |
| --- | --- |
| A · Pesquisa | Fechar o recorte usado no piloto. Registrar evidência, data do evento e pendências. |
| B · Fundação | Validar criação do lutador, navegação responsiva e carreiras independentes. |
| C · Piloto jogável | Aceitar uma das três propostas, disputar Singles, avançar a agenda, ganhar XP e carregar o estado salvo. |
| D · Empresas | Simular shows, booking, mercado e rivalidades nas sete empresas e nove destinos. |
| E · Títulos e torneios | Verificar elegibilidade e estado inicial. Simular defesas, linhagens, chaves, grupos e round robin. |
| F · Combates | Cobrir as 29 estipulações com regras e finais próprios, equipes e interferências. |
| G · Carreira completa | Implementar História ramificada, relações, economia, aposentadorias, retornos e novos talentos. |
| H · Publicação | Validar desktop, celular, integridade e múltiplas temporadas. Publicar após aprovação da versão testada. |

## Fontes iniciais

O calendário inicial inclui anúncios verificáveis conhecidos até 01/01/2026. Datas posteriores são referências da pesquisa. Cards e resultados da carreira são simulados. Dados de jogo como OVR, estilos, alinhamentos e salários recebem indicação própria.

- [NXT em 30/12/2025](https://www.wwe.com/shows/wwenxt/2025-12-30/results) e [linhagem do NXT Championship](https://www.wwe.com/titlehistory/nxt-championship).
- [TNA iMPACT! de 18/12/2025](https://tnawrestling.com/news/tna-impact-results-december-18-2025) e [anúncio de iMPACT! e Genesis](https://tnawrestling.com/news/tna-wrestling-to-make-history-over-two-special-nights-in-dallas).
- [ROH Final Battle de 05/12/2025](https://www.ringofhonor.com/post/roh-final-battle-results-dec-5-2025).
- [AEW New Year’s Smash de 31/12/2025](https://www.allelitewrestling.com/post/aew-dynamite-new-years-smash-results-december-31-2025).
- [NJPW Wrestle Kingdom 20 de 04/01/2026](https://www.njpw1972.com/tornament/result/578671).
- [AAA Guerra de Titanes 2025](https://www.wwe.com/article/aaa-guerra-de-titanes-2025).
- [Elenco oficial da BWF](https://bwf.com.br/lutadores/) e [histórico do Cinturão do Maremoto](https://bwf.com.br/maremoto-volta-a-bwf-em-show-no-proximo-sabado-conheca-sua-historia/).

Arte original identifica as ilustrações do piloto enquanto as autorizações de imagens históricas são verificadas. A documentação técnica acompanha as entregas no repositório oficial.

## Primeira versão jogável

Veja [como rodar o piloto](docs/PILOTO.md), o recorte de dados e os testes.
