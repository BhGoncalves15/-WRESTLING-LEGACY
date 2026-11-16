# Wrestling Legacy · Relatório da temporada 2026

## A. Alterações implementadas

- Calendário jogável com visualizações mensal, semanal e em lista. Cada card informa a empresa, a origem da data, a cidade e o local quando disponíveis. O calendário destaca a escalação do lutador, abre a luta em andamento e exibe os resultados dos cards já disputados.
- O avanço em um dia ou em até uma semana para quando há compromisso jogável ou decisão sobre o contrato. A agenda alimenta a disponibilidade de lutadores, as disputas por cinturão, as rivalidades e os torneios. A versão jogável do Best of the Super Juniors usa uma chave simplificada com lutadores de até 100 kg.
- O catálogo uniformiza os quadros das fotos e ilustrações dos 71 cinturões, mantém as proporções e dá acesso ao histórico visual. A página de cada título registra seus reinados, o cinturão incorporado e a luta que decidiu a unificação.
- As demonstrações dos 30 golpes foram revistas e substituídas. A inteligência artificial de lutas individuais e de equipe considera os últimos três ataques para escolher defesas e contragolpes, mesmo com ações de recuperação entre eles.
- A popularidade perde pontos após derrotas, ganha menos nas faixas altas e passa a reconhecer a variedade de golpes e as vitórias em cards especiais ou lutas por título. A variação aparece no resumo de cada combate no noticiário.
- O formato de save passou para a versão 9. Carreiras das versões 1 a 8 podem ser importadas. Uma carreira em andamento continua na agenda em que começou e tem acesso às datas verificadas em **Arquivo real 2026**. Uma carreira nova usa as datas verificadas no próprio fluxo de booking.

## B. Imagens dos cinturões

| Empresa | Títulos revisados | Fotos disponíveis na galeria e no histórico |
| --- | ---: | ---: |
| WWE e NXT | 16 | 5 |
| AEW | 10 | 9 |
| TNA | 7 | 2 |
| NJPW | 14 | 1 |
| AAA | 7 | 2 |
| ROH | 8 | 2 |
| BWF | 9 | 0 |
| **Total** | **71** | **21** |

O NXT North American Championship manteve sua fotografia de abertura. Os outros 70 títulos abrem com arte própria, identificada como **Ilustração de referência**. Na beta anterior, 12 desses títulos abriam com fotos que cortavam o cinturão, davam destaque ao lutador ou mostravam outra edição. As 18 fotografias que já existiam continuam no histórico.

Foram adicionadas três fotos de edições antigas. A réplica comemorativa do WWE Championship de 2014 entra no histórico do Undisputed WWE Championship. A versão de tira vermelha entra no histórico do AAA World Mixed Tag Team Championship. A primeira versão do ROH Pure Championship entra como referência das placas. Cada foto tem crédito, indicação de licença e descrição das adaptações. [Inventário das imagens](../public/belts/SOURCES.md)

Há referências fotográficas para 19 títulos. A busca pelas fotos frontais atuais continua aberta para os 70 títulos ilustrados. As primeiras prioridades são os campeonatos mundiais com fotos parciais ou antigas e os cinturões da BWF, cuja identidade visual foi pesquisada a partir do acervo da empresa. [Histórico do Sul-Americano](https://bwf.com.br/sul-americano/)

## C. Unificação de títulos

| Etapa | Regra |
| --- | --- |
| Pedido | Contrato ativo com a brand que administra os dois títulos, mesmos campeões, formatos e regras compatíveis e pelo menos uma defesa de cada título no mesmo reinado. |
| Aprovação imediata | Popularidade de 65 ou mais, quatro defesas somadas e diferença de prestígio de até 24 pontos. |
| Análise em até três dias de jogo | A diretoria aprova se o pedido continua válido, a diferença de prestígio é de até 32 pontos e o lutador tem popularidade de pelo menos 35 ou quatro defesas somadas. |
| Notificações | A tela de campeonatos apresenta o prazo e a decisão. O noticiário avisa quando a proposta entra em análise, é aprovada, é recusada ou perde a validade. |
| Luta | A aprovação reserva a defesa no próximo card elegível, respeitando uma chave de torneio já marcada. A vitória conclui a unificação. Em uma derrota, aplica-se o resultado da defesa ao título principal e o outro reinado continua separado. |

A identidade segue a brand que administra a linhagem. Um evento conjunto permite defender títulos compartilhados conforme o contrato. Empresas com linhagens administradas de forma independente conservam autoridade sobre seus cinturões. A proposta só é aceita quando os dois títulos pertencem à mesma brand responsável.

O novo nome combina as duas linhagens e a categoria. A arte usa um perfil por empresa, com placas, gravações e acabamentos que variam com o prestígio e a identidade visual da brand. O NXT usa as iniciais e cores próprias sobre o perfil da WWE. Os históricos dos dois cinturões são preservados. A unificação registra data, campeões, card e identificador da luta. [Regras do motor](../src/engine/title-office.ts) · [Perfil das artes](../src/content/belt-designs.ts)

## D. Vídeos dos movimentos

| Trabalho | Quantidade |
| --- | ---: |
| Demonstrações revisadas | 30 |
| Arquivos substituídos | 30 |
| Filmagens de treino com licença Creative Commons | 3 |
| Animações próprias reeditadas | 27 |
| Vídeos reproduzidos dentro do jogo em cada perfil de navegador | 30 |

As três filmagens apresentam Dropkick, German Suplex em ponte e Spear. Os trechos foram cortados até a execução do golpe, com créditos para ROEwrestling. Os outros movimentos incluem animações próprias de golpes básicos, finalizadores, ataques aéreos, submissões e movimentos especiais. Entre as poses revistas estão o RKO, o Moonsault, o Frog Splash, o Kneebar e o Spinning DDT.

Os 30 arquivos rodam no próprio catálogo, em MP4 H.264, entre aproximadamente 2,5 e 4,9 segundos. O vídeo só é carregado quando o jogador seleciona o golpe. Em caso de erro, a interface mantém as instruções e mostra a alternativa visual. [Créditos e referências dos movimentos](../public/moves/SOURCES.md)

## E. Calendário de 2026

| Agenda | Datas oficiais | Datas documentadas por fonte secundária | Cards simulados |
| --- | ---: | ---: | ---: |
| WWE Raw e especiais do elenco principal | 51 | 0 | 14 |
| WWE SmackDown | 31 | 0 | 19 |
| WWE NXT | 7 | 0 | 51 |
| AEW | 21 | 0 | 85 |
| NJPW | 31 | 1 | 54 |
| TNA | 18 | 0 | 43 |
| AAA | 15 | 0 | 38 |
| ROH | 2 | 2 | 51 |
| BWF | 0 | 14 | 12 |
| **Total** | **176** | **17** | **367** |

Os cards conjuntos contam uma vez na agenda anfitriã e aparecem também no filtro da empresa convidada. O jogo distingue datas de transmissão e gravações conjuntas quando há informação disponível. As lacunas recebem **Programação simulada**, com cadência baseada nos programas da empresa. Os confrontos e os resultados são gerados pela carreira, inclusive quando a data do card foi verificada.

- WWE inclui Royal Rumble, as duas noites da WrestleMania e do SummerSlam, Money in the Bank em 10 de outubro e Survivor Series. A WWE transferiu o Money in the Bank para Nova Orleans nessa data. [Anúncios da WWE](https://www.wwe.com/article/wwe-upcoming-events)
- A programação da AEW inclui Revolution, Double or Nothing, All In, All Out e Full Gear. O Forbidden Door aparece nas agendas da AEW e da NJPW. [Calendário da AEW](https://www.allelitewrestling.com/aew-events)
- A NJPW tem Wrestle Kingdom, New Japan Cup, Best of the Super Juniors, G1 Climax e eventos do circuito TAMASHII. A TNA tem iMPACT!, Rebellion, Slammiversary, Bound for Glory e Lockdown. [Calendário da NJPW](https://www.njpw1972.com/schedule) · [Anúncios da TNA](https://tnawrestling.com/news/tna-wrestling-releases-its-full-2026-live-events-schedule)
- A AAA inclui as duas noites da Triplemanía, em 11 e 13 de setembro, além do Worlds Collide e do Héroes Inmortales. A ROH inclui Supercard of Honor e Final Battle. A BWF tem 14 cards com data documentada em arquivo público, incluindo os In House. [Arquivo da ROH](https://www.ringofhonor.com/events) · [Referências individuais por card](../src/content/calendar-2026.ts)

## F. Testes de jogabilidade

Foram feitas duas rodadas exploratórias com quatro carreiras de janeiro a setembro. As ações foram enviadas ao motor de carreira e combate sem injetar vitórias. A tabela mostra a rodada após os ajustes de popularidade e de leitura dos ataques. Em testes independentes no navegador, também foram exercitados os fluxos de criação, seleção de contrato, luta, catálogo, calendário e um cenário preparado para retomar uma luta de unificação já em andamento.

| Lutador | Dificuldade | Empresas na carreira | Vitórias e derrotas | Lutas por título | Unificações concluídas | Popularidade final |
| --- | --- | --- | --- | ---: | ---: | ---: |
| BH | Normal | SmackDown, com renovação | 38 V e 7 D | 13 | 1 | 96 |
| Jade Anaya | Difícil | Raw → TNA | 34 V e 3 D | 13 | 1 | 78 |
| Rafael Ponte | Normal | BWF, com renovação | 11 V e 4 D | 12 | 1 | 47 |
| Cris Lima | Fácil | AEW → AAA | 57 V e 5 D | 34 | 2 | 88 |

Na rodada final foram 159 lutas do jogador, 72 lutas valendo título, 13 derrotas nessas disputas, cinco unificações e 16 recarregamentos. Foram conferidos atributos, XP, popularidade, mudanças de rivalidade, pagamentos, defesas, títulos simultâneos, vagas geradas por mudança de contrato e continuidade da agenda. Na rodada anterior, Rafael chegou ao Raw saindo da BWF, e Cris passou por AEW, AAA e NXT na mesma carreira. Um save em combate gerado no código da beta anterior foi importado e retomado do primeiro para o segundo turno.

O pedido de unificação podia ficar aberto até o evento especial seguinte. A nova regra transferiu a avaliação para um prazo fixo em dias. Antes do ajuste de popularidade, os quatro lutadores atingiram o teto até setembro. Na rodada final, a popularidade terminou entre 47 e 96. As rodadas passaram por adversários e contratos diferentes. Cris venceu 57 de 62 lutas no fácil usando Dropkick como ataque principal, o que mantém o equilíbrio entre golpes como ponto prioritário.

A bateria no navegador cobre Chromium em desktop, Chromium no perfil Pixel 7 e WebKit no perfil iPhone 13. Foram verificados os controles, a troca de alvos e duplas, o histórico de resultados, a mudança entre as visões do calendário e a reprodução das 30 demonstrações. O carregamento do vídeo selecionado evita disputar a rede com as demais demonstrações.

## G. Prioridades para a próxima revisão

| Prioridade | Ponto identificado |
| --- | --- |
| Alta | Calibrar chance de disputa e desgaste de ataques repetidos por dificuldade. Em seguida, ampliar as sessões de equilíbrio com adversários de níveis diferentes. |
| Alta | Obter fotos frontais licenciadas das edições de 2026, com atenção aos títulos principais, à BWF e às versões femininas e de duplas com menos fotos de referência. |
| Média | Dar mais consequências persistentes às rivalidades, às derrotas em grandes cards e às escolhas de renovação. As transferências e a perda de títulos já têm efeito. As decisões de bastidor e de remuneração ainda seguem o sistema da beta de Carreira Livre. |
| Média | Expandir a pesquisa de episódios semanais sem data verificada e avançar nas estipulações próprias dos grandes eventos. Os cards anunciados convivem com os formatos de luta já jogáveis e com a chave simplificada dos juniores. |
| Média | Validar desempenho e controles em aparelhos móveis físicos e sessões longas. A verificação automatizada usa perfis móveis de navegador. |

## H. Arquivos, commits e versão jogável

| Área | Arquivos principais |
| --- | --- |
| Dados e agenda | `src/content/calendar-2026.ts`, `src/content/calendar.ts`, `src/content/tournaments.ts`, `src/ui/calendar.tsx` |
| Unificações e carreira | `src/engine/title-office.ts`, `src/engine/career.ts`, `src/engine/titles.ts`, `src/engine/tag-teams.ts`, `src/ui/championships.tsx` |
| Artes e demonstrações | `src/content/belt-designs.ts`, `src/content/belt-photos.ts`, `src/content/move-demos.mjs`, `src/ui/belt-art.tsx`, `src/ui/moveset.tsx`, `public/belts/`, `public/moves/` |
| Jogabilidade e compatibilidade | `src/engine/combat.ts`, `src/storage/save-format.ts`, `tests/beta-review.test.ts`, `tests/browser/review.spec.ts` |

O trabalho está na branch `feat/temporada-2026` do repositório oficial. O PR reúne os commits e as verificações do pacote. No Windows, extraia o ZIP inteiro e execute `JOGAR-WINDOWS.exe`. Para abrir em um celular na mesma rede, execute `JOGAR-NO-CELULAR.cmd` no PC e abra o endereço indicado. [Commits da atualização](https://github.com/BhGoncalves15/-WRESTLING-LEGACY/pull/10/commits) · [PR da temporada](https://github.com/BhGoncalves15/-WRESTLING-LEGACY/pull/10) · [Guia de instalação e importação](BETA-CARREIRA-LIVRE.md)
