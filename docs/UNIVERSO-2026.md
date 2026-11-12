# Universo de 2026

A Carreira Livre agora abre em 01/01/2026 com WWE Raw, SmackDown e NXT, AEW, NJPW, TNA, AAA, ROH e BWF. São sete empresas e nove agendas jogáveis. Cada rodada do mercado oferece três propostas de empresas distintas. A divisão, o OVR, a popularidade e a exigência de cada empresa influenciam as ofertas.

## Como rodar

```bash
git clone --branch feat/combate-trios https://github.com/BhGoncalves15/-WRESTLING-LEGACY.git
cd ./-WRESTLING-LEGACY
npm ci
npm run dev
```

Abra a URL do Vite com Node.js 22.13 ou posterior.

## Elencos e calendário

O catálogo de abertura registra 292 lutadores e uma identidade por pessoa e associa cada participação a uma data e fonte. Participações cruzadas têm o mesmo ID. Por exemplo, Dominik Mysterio aparece no Raw e na AAA. Atribuições de escalação, OVR, estilos, alinhamentos e salários são parâmetros do jogo. Perfis refletem a evidência disponível. Informações biográficas e vínculos privados continuam em pesquisa.

A tela **Empresas** permite escolher cada agenda, buscar lutadores e consultar registros reais posteriores à abertura. O arquivo de 2026 e as observações posteriores servem de referência. As participações de 2026 nesses registros pertencem ao histórico real. Os elencos, as datas e os resultados da carreira evoluem pela simulação.

O **Calendário** inclui 14 datas anunciadas antes da abertura e 25 registros de eventos reais de 2026. A interface tem quatro vistas. Próximos traz shows recorrentes e especiais. Anunciados mostra datas que já eram públicas no início da carreira. Resultados mostra os cards que aconteceram no save. Arquivo real 2026 reúne eventos documentados para consulta. Eventos compartilhados da WWE recebem lutadores das brands participantes. Um lutador pode aparecer em várias agendas, com apenas um compromisso por dia de simulação.

## Campeonatos

O catálogo reúne as 72 entradas do Documento Mestre em 71 IDs. O AAA World Cruiserweight Championship tem um registro canônico e aparece nos filtros da WWE e da AAA. Cada cinturão tem formato, divisão, fonte e situação em 01/01/2026. O cinturão de Rookies da BWF começa vago. O TNA Knockouts Television Championship e o NJPW TAMASHII Openweight Championship aparecem como títulos posteriores. O estado inicial do Maremoto da BWF segue em apuração.

Quarenta e um cinturões individuais têm regras de Singles e campeão disponível para defesas simuladas. O jogador pode receber oportunidades após três vitórias e popularidade suficiente. A página **Campeonatos** apresenta o campeão atual, o reinado, as defesas e as mudanças ocorridas no save. A transferência para outra agenda libera cinturões em posse do jogador que pertenciam à agenda anterior.

Treze cinturões de duplas têm defesas e trocas de campeões nas sete empresas. O reinado é da dupla, independentemente de quem fez a finalização. O cinturão feminino de duplas da WWE aparece nas três brands, com disputas na agenda do Raw e nos seus eventos compartilhados. Dion Lennox e Osiris Griffin representam o DarkState na abertura. Ángel de Oro e Niebla Roja entram no elenco jogável da NJPW pela participação no cinturão STRONG, e Brian Racer entra no elenco da BWF pelo reinado com Christopher.

Quatro cinturões de trios têm defesas, trocas de campeões e histórico compartilhado pelo trio inteiro. São o AEW World Trios Championship, o NEVER Openweight 6-Man Tag Team Championship da NJPW, o AAA World Trios Championship e o ROH World Six-Man Tag Team Championship. Os campeões de abertura usam a formação registrada na fonte de cada título.

O IWGP Junior Heavyweight Tag Team Championship, o NJPW TAMASHII Tag Team Championship, o cinturão misto da AAA e os formatos individuais especiais ficam disponíveis para consulta histórica. Suas disputas dependem das regras específicas de cada divisão ou circuito.

## Lutas por equipes

Em **Meu lutador**, você pode formar uma dupla e um trio com parceiros da sua divisão e brand. **Formato preferido nos cards** permite alternar entre Singles, Tag Team e Trios. As defesas de título têm prioridade sobre essa escolha. Duas vitórias com a mesma formação e popularidade de pelo menos 14 habilitam oportunidades pelo cinturão da divisão. A equipe volta aos cards se você renovar com a mesma brand. Encerrar uma formação libera seus títulos daquele formato. Mudar de brand encerra as duas parcerias.

Cada lado tem um lutador legal. Em Trios, escolha qual dos dois reservas entra na sua tag. Uma troca exige que o lutador no ringue esteja em pé, stamina de quem sai e de quem entra, e dois turnos entre tags da mesma equipe. Quem espera no apron recupera stamina. A IA decide os golpes dos parceiros. No apron, você pode acompanhar a luta, pedir para voltar ou interromper uma finalização do rival. Cada equipe tem um salvamento por luta.

A primeira queda por pinfall ou submissão encerra o combate. O resultado conta para todos os integrantes. O calendário mostra as duas formações completas e identifica quem finalizou. Os cards de trios dependem da disponibilidade de seis lutadores da divisão no dia.

## Compatibilidade

A versão 4 abre e importa saves das versões 1, 2 e 3. O calendário das novas empresas começa a avançar a partir da data corrente dos saves do piloto. Turno da luta, contratos, pagamentos, XP, atributos e resultados anteriores permanecem no arquivo. Em lutas por equipes, o save guarda o lutador legal de cada lado, os recursos de todos os participantes e os salvamentos já usados.

O recorte de abertura e o arquivo de 2026 estão em expansão conforme as fontes são conferidas. O catálogo atual guarda fontes ao lado dos dados. Os comandos de testes e os perfis de navegador estão no [guia do piloto](PILOTO.md#como-rodar).

## Verificação das lutas por equipes

Os 50 testes do motor e do armazenamento cobrem troca de lutador legal, salvamento do parceiro, defesas, pagamento, vacância, conflito de agenda e importação. Três carreiras, uma por dificuldade, foram simuladas até janeiro de 2029. Cada uma gerou de 136 a 194 lutas de trios, disputou os quatro cinturões e passou pela exportação e reimportação do save. Saves gerados pelas versões 1, 2 e 3 foram retomados no mesmo turno.
