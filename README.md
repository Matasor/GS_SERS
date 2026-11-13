# Energia Solidária AI

Global Solution da FIAP · 1º ano de Ciência da Computação (1CC)  
Citizen Assist AI · Soluções em Energias Renováveis e Sustentáveis

## Equipe

| Matheus Levi Dagel | RM:571961 |
| Nome completo | RM |
| Nome completo | RM |


## Por que fizemos o projeto?

Quando a conta de luz sobe, pode ser difícil saber qual aparelho mais gasta e por onde começar a economizar. O site foi pensado para famílias de baixa renda que precisam entender esses gastos antes de decidir se vale mudar hábitos, comprar lâmpadas ou investir em energia solar.

O simulador mostra o gasto estimado de cada aparelho. O assistente usa os números que aparecem na tela para comparar as opções e indicar onde buscar orientação sobre a conta de luz. Também é possível alternar entre os modos claro e escuro no topo da página.


## De onde vieram os números?

O exemplo simula uma casa fictícia durante *30 dias*. Os valores abaixo foram escolhidos para comparar as opções com as mesmas condições.

| Valor do exemplo | Como foi escolhido |
| --- | --- |
| *180 kWh em 30 dias* | É o consumo total adotado para a casa fictícia. Os aparelhos listados somam 149,45 kWh e os 30,55 kWh restantes representam outros usos da casa. |
| *R$ 1,062 por kWh* | É uma tarifa ilustrativa para comparar os cenários com o mesmo preço por kWh. Para simular a sua casa, use a tarifa da sua fatura. |
| *R$ 45 para as lâmpadas* | O exemplo considera três lâmpadas LED a R$ 15 cada e uma redução de cinco minutos por dia no uso do chuveiro. |
| *R$ 6.000 para o sistema solar* | É um valor ilustrativo de instalação para comparar o investimento com o das lâmpadas. O exemplo usa um sistema de 1 kWp e R$ 30 de custo no período. Para avaliar uma instalação real, use um orçamento para o seu imóvel. |
| *4,5 horas de sol pico, 75% de desempenho e 70% de aproveitamento para abatimento* | São hipóteses ajustáveis para estimar a geração e a economia solar. Para refazer a simulação, consulte os dados de sol da sua região no Atlas do INPE e verifique as condições de compensação com a distribuidora. |

O chuveiro do exemplo tem 5.500 W e é usado por 27 minutos por dia (74,25 kWh no período). A geladeira tem consumo informado de 35 kWh. As três lâmpadas de 60 W são usadas por cinco horas por dia (27 kWh no total), e a TV de 110 W fica ligada por quatro horas por dia (13,2 kWh). Esses valores são hipóteses do exemplo, ajustáveis na tela.

## O que a comparação mostra?

A parcela de energia no exemplo é *180 × R$ 1,062 = R$ 191,16*. Para aparelhos com potência em watts, o site divide a potência por 1.000, multiplica pelas horas de uso por dia, pelos dias de uso e pela quantidade de aparelhos.

| Opção | O que muda em 30 dias | Economia estimada | Investimento inicial |
| --- | --- | --- | --- |
| LED e banho mais curto | Reduzem o consumo em 36,7 kWh. | R$ 38,98 | R$ 45 |
| Energia solar | Gera 101,25 kWh. O modelo estima 70,875 kWh de abatimento. | R$ 45,27, após descontar R$ 30 de custo no período | R$ 6.000 |

A redução de consumo vem de 22,95 kWh com as lâmpadas e 13,75 kWh com o banho mais curto. A geração solar usa *1 × 4,5 × 30 × 0,75 = 101,25 kWh*. O abatimento do exemplo aplica 70% ao menor valor entre geração e consumo. A economia solar no exemplo é 70,875 kWh × R$ 1,062/kWh − R$ 30, ou cerca de R$ 45,27. Ao combinar as duas opções, o site recalcula o abatimento com o consumo que sobra após as medidas de economia.

Para uma família com pouco dinheiro para investir, encurtar o banho é um primeiro passo sem custo. Para trocar as lâmpadas, vale comparar a luminosidade e dar o destino adequado às lâmpadas antigas. O solar gera energia de uma fonte renovável, mas depende do sol na região, da sombra, do espaço no telhado e do orçamento. Também é preciso considerar o descarte dos painéis no fim da vida útil. A fatura real pode incluir outras cobranças, e o abatimento depende das regras da distribuidora.

## Como conferir o assistente

Clique em *Carregar exemplo* e depois em *Compare eficiência e solar* no assistente. A resposta deve mostrar R$ 38,98 com eficiência e R$ 45,27 com solar. Mude a tarifa para *R$ 1,00/kWh* e veja a resposta atualizar para *R$ 36,70* e *R$ 40,88*. As fontes aparecem abaixo da resposta.

## Fontes e registros

- [Ministério de Minas e Energia — Dicas de eficiência energética](https://www.gov.br/mme/pt-br/assuntos/noticias/julho-26/descubra-como-aplicar-a-eficiencia-energetica-no-seu-dia-a-dia)
- [ANEEL — Geração distribuída](https://www.gov.br/aneel/pt-br/assuntos/geracao/geracao-distribuida)
- [INPE — Atlas Brasileiro de Energia Solar](https://labren.ccst.inpe.br/atlas_2017.html)
- [Seis testes feitos no navegador](tests/testes.txt)
- [Ficha para registrar os testes com usuários](tests/testes-com-usuarios.txt)
- [Roteiro para gravar o vídeo](docs/roteiro-do-video.txt)

Os testes de funcionamento foram feitos com dados fictícios. As sessões com pessoas reais e o registro dos comentários e ajustes estão pendentes.
