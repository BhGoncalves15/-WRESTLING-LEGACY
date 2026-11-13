# Revisão da beta da Carreira Livre

A revisão parte da [beta anterior](https://github.com/BhGoncalves15/-WRESTLING-LEGACY/pull/8), na branch `feat/beta-carreira-livre`. O recorte inicial segue em 1º de janeiro de 2026, com sete empresas, nove agendas, 300 perfis, 71 cinturões cadastrados e 62 jogáveis na abertura. [Como testar](BETA-CARREIRA-LIVRE.md)

## Código e download

- A revisão está no [PR #9](https://github.com/BhGoncalves15/-WRESTLING-LEGACY/pull/9). Os [commits](https://github.com/BhGoncalves15/-WRESTLING-LEGACY/pull/9/commits) registram a inclusão dos recursos, a revisão dos sistemas e os ajustes encontrados nos testes.
- O ZIP inclui o iniciador para Windows e o modo para jogar no celular pela mesma rede Wi-Fi. [Baixar a beta testada](https://github.com/BhGoncalves15/-WRESTLING-LEGACY/actions/runs/43425976072/artifacts/14037476616)

## Problemas encontrados e correções

| Categoria | Problema observado na beta | Alteração |
| --- | --- | --- |
| Bug | O cadastro aceitava idades fora da faixa solicitada. | Criação e motor validam inteiros entre 18 e 24. A idade exibida avança a cada mudança de temporada. |
| Bug | O relato de recuperação dizia que o lutador ficou em pé mesmo se já estivesse de pé ou no corner. | A narração acompanha a posição de partida. |
| Qualidade de vida | Após o fim do contrato, a empresa atual podia ficar fora da próxima lista de propostas. | A renovação entra na lista de três propostas quando o elenco tem a divisão correspondente. O pagamento ofertado considera o contrato anterior e pode ser renegociado. |
| Qualidade de vida | A escolha de golpe dependia de percorrer 20 seletores. | O catálogo tem busca, filtro, contagem por categoria e substituição no mesmo tipo. |
| Bug | Servidores que descompactam arquivos do catálogo durante o transporte podiam impedir a criação. | O leitor reconhece o conteúdo entregue e abre tanto os dados já descompactados quanto o gzip do iniciador local. |
| Qualidade de vida | A mídia acrescentaria espera na criação. | Editor e catálogo carregam ao abrir. O jogo pede somente o vídeo selecionado e preserva a descrição se a mídia falhar. |
| Reformulação | Origem, aparência, traje e entrada eram campos de texto. | Origem vinculada ao catálogo, editor 2D e retirada da entrada da interface. Os textos anteriores continuam no JSON legado. |
| Reformulação | A lista de campeonatos mostrava sobretudo nomes e reinados. | Cards com fotos atribuídas, busca, prestígio, status, versões e histórico de reinados. |
| Nova funcionalidade | A simulação ainda não tinha versões de design nem unificações. | A diretoria pode reformular, homenagear um campeão ou unificar títulos elegíveis. O desenho e o motivo são gravados na carreira. |

## Criação e progressão

- A idade exibida é a inicial mais os anos decorridos desde 2026. A temporada começa em 1º de janeiro, pois o cadastro usa idade e dispensa a data de nascimento. Saves antigos continuam aceitando a faixa de idade que a beta anterior gravava.
- O editor combina tom de pele, rosto, cabelo, pelos faciais, olhos, sobrancelhas, altura, porte, proporções, acessórios e traje em camadas. Frente, costas e zoom reagem na hora. O jogador pode revisar o visual depois da criação. Os atributos e as condições de combate dependem das regras esportivas e da evolução por XP.
- O retrato acompanha perfil, contratos, cards de lutas, resultados, histórico, salvamentos e notícias geradas sobre o personagem.
- A origem traz **250 países e territórios, 5.327 subdivisões e 156.112 localidades** no pacote. O recorte brasileiro usa os códigos de município do IBGE, incluindo Três Lagoas. A lista de países mostra bandeiras, nomes em português e busca sem acentos. Cada troca de país ou subdivisão limpa a seleção dependente. A cidade manual mantém a divisão selecionada e fica registrada com ID de cidade vazio. [Base e licenças](../public/geography/SOURCES.md)
- Os **30 golpes** têm vídeos 2D originais, curtos e silenciosos, com reprodução, pausa e repetição dentro do jogo. O catálogo mostra atributo, efeito, stamina, posição e momentum. Os 20 espaços seguem a distribuição 4/4/3/2/3/2/2. O Spear abre com Força 65 e 40 XP. A evolução de um golpe fica guardada se ele for temporariamente retirado do moveset.
- As referências verificadas cobrem RKO (Jumping Cutter), Spear, Frog Splash e Over The Moonsault. O moveset dos NPCs Roman Reigns, Bron Breakker e Dominik Mysterio usa as variantes já disponíveis. IYO SKY mantém o Moonsault e ganha a referência nominal no catálogo. O RKO usa o ID existente de Jumping Cutter. [Perfis e atribuições](../src/content/move-details.ts)

## Cinturões

- A galeria inclui **18 fotografias licenciadas, cobrindo 16 títulos**. Treze têm imagem da edição de abertura. NXT Championship, TNA World e TNA Knockouts World têm fotos de edições históricas. Quando falta uma imagem verificada, o card indica a pendência e oferece a fonte do título. Os recortes de fotografias mantêm placas e cores e são distribuídos com créditos e licenças. [Créditos das imagens](../public/belts/SOURCES.md)
- A diretoria decide depois dos cards de um evento especial. Para uma unificação, os títulos precisam ter a mesma agenda, divisão, formato, regras e política de compartilhamento. O campeão ou a equipe precisa ter defendido os dois cinturões. O algoritmo considera defesas e diferença de prestígio e pode recusar uma proposta. Com a unificação aprovada, a linhagem incorporada deixa de ser defendida, a principal continua com novo design e os dois registros históricos permanecem consultáveis.
- A reformulação usa um marco narrativo do reinado ou do ciclo de campeões, com quatro temporadas como referência. A homenagem requer quatro defesas e pelo menos 100 dias de reinado. Essas regras são parâmetros de beta e ficam registradas na simulação por carreira.
- A diretoria usa um gerador visual local para montar placa, material, correia, ornamentos e inscrições a partir de nome, empresa, prestígio e linhagens. O gerador produz SVG a partir dos dados salvos. Imagens históricas ficam no catálogo de fotografias. O resultado fictício é indicado no card.
- Para integrar um modelo de imagens futuramente, o motor já produz um [brief estruturado](../src/content/belt-designs.ts). Um serviço opcional poderia receber esse brief por fila e devolver uma imagem com identificador e proveniência, com limite por carreira, tempo máximo de resposta, armazenamento versionado e exportação ou cache do resultado. Credenciais e faturamento ficariam no servidor. A arte local já funciona sem rede e serve de reserva durante falhas ou espera. Uma integração externa depende da escolha de provedor, política de uso, orçamento e infraestrutura. [Documentação de geração de imagens](https://platform.openai.com/docs/guides/image-generation)

## Simulações de jogo

- Passaram **84 testes de motor, catálogo e salvamento**, **42 testes no navegador** e os testes do servidor local. O Playwright executou Chromium desktop e os perfis móveis Android (Chromium) e iPhone (WebKit). Os cenários novos verificaram cadastro, origem e troca de subdivisão, aparência após recarregar, busca e reprodução de golpes e galeria com histórico e unificação. [Resultados dos testes](https://github.com/BhGoncalves15/-WRESTLING-LEGACY/actions/runs/43425976072)
- Executei o iniciador extraído do ZIP em uma máquina Windows x64. O processo serviu a página, os bytes do catálogo gzip e um intervalo do vídeo do RKO. A verificação usou o modo `-sem-navegador` do iniciador. [Resultado do teste no Windows](https://github.com/BhGoncalves15/-WRESTLING-LEGACY/actions/runs/43425976072/job/131889707835)
- Importei um save v7 gerado pela beta anterior com uma Fatal 4-Way em andamento e avancei a luta do primeiro para o segundo turno. O arquivo da revisão usa o formato v8. Para continuar uma carreira criada em outro endereço, use a exportação e a importação de JSON conforme o [guia da beta](BETA-CARREIRA-LIVRE.md#começar-ou-continuar-uma-carreira).
- Simulei três temporadas em cada dificuldade com a mesma semente para verificar a continuidade do calendário. Cada carreira avançou por 1.590 shows nas nove agendas e 51 torneios. O personagem começou com 24 anos, chegou aos 27 e o save exportado tinha 2,32 MB. Cada universo produziu 26 reformulações, onze homenagens e cinco unificações. O teste de importação verificou que os títulos incorporados saíram apenas dos cards posteriores e que outra carreira manteve seu próprio catálogo.
- Joguei 91 combates individuais no motor até o fim de cinco contratos, com estratégias variadas, Dropkick repetido e recuperação passiva. As médias por carreira ficaram entre 7,8 e 9,4 turnos. Houve pinfall, submissão, uso de corner, reversões, signatures e finishers. A recuperação passiva perdeu os 18 combates da amostra no NXT. A sequência de Dropkick venceu cinco de cinco na amostra pequena da BWF. Uma amostra maior é necessária antes de alterar o equilíbrio por empresa.
- Conferi valores negociados, participação e bônus, renovação, mudança de empresa e retomada de lutas salvas. O conjunto de navegador também cobre Tag Team, Trios, Duplas mistas, Triple Threat, Fatal 4-Way, finalizações interrompíveis, torneios e o calendário em 320 px.

## Pendências do Documento Mestre

- Completar fotos das 58 edições de abertura restantes e o arquivo de versões antigas. A pesquisa de signatures e finishers continua para os demais lutadores.
- Implementar criação de campeonatos independentes, outras reorganizações de brand, arte externa opcional e um sistema de gestão dos elencos com XP, mudanças de empresa, dispensas, aposentadorias e novos talentos.
- Expandir contratos com rescisão antecipada, duração negociável, exclusividade e oportunidades. A beta permite acompanhar o vencimento e decidir entre renovação ou mudança.
- Ampliar estipulações com regras próprias, Carreira História, promos, facções, economia, sincronização e balanço de longo prazo.
