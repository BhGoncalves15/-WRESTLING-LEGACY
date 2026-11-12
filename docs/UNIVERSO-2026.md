# Universo de 2026

A Carreira Livre agora abre em 01/01/2026 com WWE Raw, SmackDown e NXT, AEW, NJPW, TNA, AAA, ROH e BWF. São sete empresas e nove agendas jogáveis. Cada rodada do mercado oferece três propostas de empresas distintas. A divisão, o OVR, a popularidade e a exigência de cada empresa influenciam as ofertas.

## Como rodar

```bash
git clone --branch feat/combates-multiplos https://github.com/BhGoncalves15/-WRESTLING-LEGACY.git
cd ./-WRESTLING-LEGACY
npm ci
npm run dev
```

Abra a URL do Vite com Node.js 22.13 ou posterior.

## Elencos e calendário

O catálogo de abertura registra 300 lutadores e uma identidade por pessoa e associa cada participação a uma data e fonte. Participações cruzadas têm o mesmo ID. Por exemplo, Dominik Mysterio aparece no Raw e na AAA. Atribuições de escalação, OVR, estilos, alinhamentos e salários são parâmetros do jogo. Perfis refletem a evidência disponível. Informações biográficas e vínculos privados continuam em pesquisa.

A tela **Empresas** permite escolher cada agenda, buscar lutadores e consultar registros reais posteriores à abertura. O arquivo de 2026 e as observações posteriores servem de referência. As participações de 2026 nesses registros pertencem ao histórico real. Os elencos, as datas e os resultados da carreira evoluem pela simulação.

O **Calendário** inclui 14 datas anunciadas antes da abertura e 26 registros de eventos reais de 2026. A interface tem quatro vistas. Próximos traz shows recorrentes e especiais. Anunciados mostra datas que já eram públicas no início da carreira. Resultados mostra os cards que aconteceram no save. Arquivo real 2026 reúne eventos documentados para consulta. Eventos compartilhados da WWE recebem lutadores das brands participantes. Um lutador pode aparecer em várias agendas, com apenas um compromisso por dia de simulação.

## Campeonatos

O catálogo reúne as 72 entradas do Documento Mestre em 71 IDs. O AAA World Cruiserweight Championship tem um registro canônico e aparece nos filtros da WWE e da AAA. Cada cinturão tem formato, divisão, fonte e situação em 01/01/2026. O cinturão de Rookies da BWF começa vago. O TNA Knockouts Television Championship e o NJPW TAMASHII Openweight Championship aparecem como títulos posteriores. O estado inicial do Maremoto da BWF segue em apuração.

Quarenta e dois cinturões individuais têm campeão ou vacância simulada. O jogador pode receber oportunidades com três vitórias individuais na carreira, popularidade de 18 ou mais e posição entre os oito primeiros da divisão. A página **Campeonatos** apresenta o campeão atual, o reinado, as defesas e as mudanças ocorridas no save. A transferência para outra agenda libera cinturões em posse do jogador que pertenciam à agenda anterior.

Quinze cinturões de duplas da mesma divisão têm defesas e trocas de campeões nas sete empresas. O reinado é da dupla, independentemente de quem fez a finalização. O cinturão feminino de duplas da WWE aparece nas três brands, com disputas na agenda do Raw e nos seus eventos compartilhados. Dion Lennox e Osiris Griffin representam o DarkState na abertura. Ángel de Oro e Niebla Roja entram no elenco jogável da NJPW pela participação no cinturão STRONG, e Brian Racer entra no elenco da BWF pelo reinado com Christopher.

Quatro cinturões de trios têm defesas, trocas de campeões e histórico compartilhado pelo trio inteiro. São o AEW World Trios Championship, o NEVER Openweight 6-Man Tag Team Championship da NJPW, o AAA World Trios Championship e o ROH World Six-Man Tag Team Championship. Os campeões de abertura usam a formação registrada na fonte de cada título.

O **AAA World Mixed Tag Team Championship** começa com Chelsea Green e Ethan Page. Cada dupla reúne um integrante da divisão masculina e outro da feminina. Na regra do jogo, uma tag troca o lutador legal dos dois lados ao mesmo tempo.

A **NJPW** tem dois títulos Junior jogáveis. DOUKI começa com o cinturão individual e forma a dupla campeã com SHO. O jogador usa o peso de ringue cadastrado, com limite de 100 kg por integrante. Os adversários são selecionados entre os participantes documentados da divisão Junior.

O **NJPW TAMASHII Tag Team Championship** começa com Magic Mark e Pretty Richie. Ele entra nos cards regionais simulados do TAMASHII, que integram a agenda da NJPW e usam participantes documentados do circuito. As datas geradas são da simulação. O arquivo histórico inclui a disputa real de maio de 2026. O TAMASHII Openweight aparece como título posterior à abertura.

## Lutas por equipes

Em **Meu lutador**, você pode formar uma dupla e um trio com parceiros da sua divisão e brand. Na AAA, **Minha dupla mista** permite convidar um parceiro da outra divisão, incluindo convidados registrados na empresa. **Formato preferido nos cards** permite alternar entre os formatos disponíveis. As defesas de título têm prioridade sobre essa escolha. Duas vitórias com a mesma formação e popularidade de pelo menos 14 habilitam oportunidades pelo cinturão da divisão. A equipe volta aos cards se você renovar com a mesma brand. Encerrar uma formação libera seus títulos daquele formato. Mudar de brand encerra as parcerias.

Cada lado tem um lutador legal. Em Trios, escolha qual dos dois reservas entra na sua tag. Uma troca exige que o lutador no ringue esteja em pé, stamina de quem sai e de quem entra, e dois turnos entre tags da mesma equipe. Quem espera no apron recupera stamina. A IA decide os golpes dos parceiros. No apron, você pode acompanhar a luta, pedir para voltar ou interromper uma finalização do rival. Cada equipe tem um salvamento por luta.

A primeira queda por pinfall ou submissão encerra o combate. O resultado conta para todos os integrantes. O calendário mostra as duas formações completas e identifica quem finalizou. Os cards de trios dependem da disponibilidade de seis lutadores da divisão no dia.

## Triple Threat e Fatal 4-Way

Escolha **Triple Threat** ou **Fatal 4-Way** em **Meu lutador → Formato preferido nos cards**. Cada lutador age por conta própria e pode mirar qualquer adversário. Troque seu alvo na tela de combate para dirigir o próximo golpe. O jogo grava a escolha no save, e o turno só avança quando você confirma uma ação.

A primeira queda por pinfall ou submissão encerra a luta. Em uma disputa de cinturão individual, quem conseguir a queda fica com o título, inclusive quando o campeão estiver fora da finalização. [Triple Threat na WWE](https://www.wwe.com/shows/hellinacell/history/hellinacell/matches/11769584) · [Fatal 4-Way na WWE](https://www.wwe.com/shows/nomercy/2006/maineventchange)

Os adversários podem quebrar a contagem ou a chave. Quando uma finalização entre adversários está prestes a decidir a luta e seu lutador está em pé com condição positiva e pelo menos 12 de stamina, o jogo pausa para você reagir. Interromper custa 12 de stamina e derruba o lutador que aplicava a finalização. Você pode salvar ou reabrir a carreira nessa pausa.

Os dois formatos também podem aparecer nos eventos especiais simulados. O booking usa um formato menor quando o elenco disponível não preenche a luta. Torneios e defesas por equipe seguem o formato da disputa. O calendário registra todos os participantes, o vencedor e quem sofreu a queda. O vencedor soma uma vitória individual e os demais participantes somam uma derrota.

## Competições

Em **Competições → Rankings**, filtre as nove agendas por divisão. A classificação individual usa uma janela de 90 dias. Cada vitória em Singles, Triple Threat ou Fatal 4-Way vale três pontos. Em torneios, a vitória vale cinco. A pontuação ajuda a escolher os desafiantes nos cards e os cabeças de chave dos torneios.

Em **Rivalidades**, acompanhe o placar das séries. Em Singles, uma disputa de cinturão ou uma vitória de cada lado abre uma rivalidade. Os cards dão preferência a revanches com pelo menos uma semana de intervalo. Duas vitórias fecham a série, e o interesse esfria após sete semanas de inatividade. Acompanhe as aberturas e os desfechos em **Notícias**. O jogador ganha oito pontos extras de XP quando luta numa rivalidade ativa.

Em **Torneios**, escolha agenda, divisão e temporada. As copas eliminatórias têm quatro participantes e duas semifinais. O New Japan Cup usa essa chave. G1 Climax e Continental Classic usam dois grupos de três com todos contra todos e uma final entre os líderes. As vitórias de grupo valem dois pontos no G1 e três no Continental. Os desempates consideram os confrontos entre os empatados e depois a ordem de entrada. As páginas das edições incluem as referências oficiais para os torneios adaptados.

Cada agenda tem pelo menos um torneio anual no universo simulado. As copas estão disponíveis nas divisões com elenco suficiente para preencher a chave. Use **Inscrever-se** antes do show de abertura com contrato ativo na agenda e na divisão do torneio. O contrato precisa cobrir a final. As lutas da sua inscrição são individuais e jogáveis. Os outros confrontos avançam conforme o calendário, mesmo em carreiras sem contrato. Na montagem das chaves, a empresa preserva os parceiros do jogador quando há outros participantes disponíveis. As chaves registram participantes e vencedores de cada temporada. Rodadas, resultados e finais também aparecem no calendário e nas notícias.

## Compatibilidade

A versão 7 abre e importa saves das versões 1 a 6. Rankings e rivalidades usam os resultados já disputados. A migração das versões 1 a 5 inicia os torneios na próxima abertura prevista no calendário do save. Em carreiras anteriores à versão 5, use **Meu lutador** para registrar o peso de ringue uma vez. Em lutas por equipes, o save guarda o lutador legal de cada lado, os recursos de todos os participantes e os salvamentos já usados.

O recorte de abertura e o arquivo de 2026 estão em expansão conforme as fontes são conferidas. O catálogo atual guarda fontes ao lado dos dados. Os comandos de testes e os perfis de navegador estão no [guia do piloto](PILOTO.md#como-rodar).

## Verificação das lutas por equipes

Os 57 testes do motor e do armazenamento cobrem trocas de lutador legal, salvamento, defesas, pagamento, vacância, elegibilidade, conflito de agenda e importação. Três carreiras, uma por dificuldade, simularam até janeiro de 2029. Cada uma teve 37 cards do TAMASHII, registrou disputas pelos quatro títulos desta etapa e passou pela exportação e reimportação do save. Uma carreira exportada pelo código da versão 4 preservou as 92 fichas de shows, a parceria com DOUKI e o andamento da luta ao continuar na versão 5.

## Verificação das competições

Os testes cobrem classificação, inscrições, confrontos das chaves, desempates, rivalidades e retomada de uma luta de torneio. As simulações de 2026 a 2028 passaram pelas nove agendas nas três dificuldades. Cada carreira fechou 51 edições de torneios e registrou disputas pelos 62 cinturões jogáveis. Um save gerado pelo código da versão 5 conservou seus 176 shows, a formação de dupla e o combate em andamento ao passar para a versão 6.

## Verificação de Triple Threat e Fatal 4-Way

Uma carreira gerada no código da versão 6 conservou 134 shows, a chave do torneio e o turno de uma semifinal ao passar para a versão 7. Uma comparação de 400 lutas de Singles, Tag Team, Trios e duplas mistas encontrou os mesmos resultados, narração e estado do sorteio com a mesma escalação e semente. Nas três simulações de 2026 a 2028, todos os 62 cinturões jogáveis foram disputados e as 51 edições dos torneios foram concluídas em cada carreira. Os cards registraram 92 Triple Threats e 74 Fatal 4-Ways no total.
