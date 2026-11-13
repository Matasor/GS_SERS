import { deviceConsumption, efficiencyScenario, numberInRange, socialPath, solarScenario } from './energy.js';
import { sources } from './references.js';

const $ = id => document.getElementById(id);
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const precision = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const tariffFormat = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4
});
const money = value => currency.format(Math.abs(value) < 0.005 ? 0 : value);
const energy = value => `${precision.format(Math.abs(value) < 0.005 ? 0 : value)} kWh`;
const dash = '—';

const defaults = {
  consumption: '180', tariff: '1,062', days: '30',
  'led-qty': '3', 'led-old': '60', 'led-new': '9', 'led-hours': '5', 'led-cost': '45',
  'shower-power': '5500', 'shower-current': '27', 'shower-minutes': '5',
  'solar-power': '1', 'solar-hours': '4,5', 'solar-performance': '75', 'solar-credit': '70',
  'solar-investment': '6000', 'solar-cost': '30'
};
const exampleDevices = [
  { name: 'Chuveiro elétrico', mode: 'power', watts: 5500, hours: 0.45, days: null, quantity: 1 },
  { name: 'Geladeira', mode: 'direct', kwh: 35, quantity: 1 },
  { name: 'Lâmpadas', mode: 'power', watts: 60, hours: 5, days: null, quantity: 3 },
  { name: 'Televisão', mode: 'power', watts: 110, hours: 4, days: null, quantity: 1 }
];

let devices = [];
let current = {};
let editIndex = null;
let activeQuestion = '';
let socialRequested = false;

function write(id, value) { $(id).textContent = value; }
function feedback(id, message = '') {
  const element = $(id);
  element.hidden = !message;
  if (element.textContent !== message) element.textContent = message;
}
function read(id, label, max, extras = {}) {
  const input = $(id);
  try {
    const value = numberInRange(input.value, label, { max, ...extras });
    input.removeAttribute('aria-invalid');
    return value;
  } catch (error) {
    input.setAttribute('aria-invalid', 'true');
    throw error;
  }
}
function clearInvalid(container) {
  for (const element of container.querySelectorAll('[aria-invalid]')) element.removeAttribute('aria-invalid');
}
function element(tag, contents, className) {
  const node = document.createElement(tag);
  if (contents !== undefined) node.textContent = contents;
  if (className) node.className = className;
  return node;
}

function loadExample(announce = false) {
  for (const [id, value] of Object.entries(defaults)) $(id).value = value;
  $('led-on').checked = true;
  $('shower-on').checked = true;
  devices = exampleDevices.map(device => ({ ...device }));
  for (const id of ['simulador', 'comparacao']) clearInvalid($(id));
  write('scenario-status', 'Exemplo ilustrativo');
  update();
  if (announce) write('announcer', 'Exemplo carregado. Os dados da conta, equipamentos e cenários foram preenchidos.');
}
function markCustom() { write('scenario-status', 'Simulação personalizada'); }
function tryRead(action, errorId) {
  try {
    const result = action();
    feedback(errorId);
    return result;
  } catch (error) {
    feedback(errorId, error.message);
    return null;
  }
}
function billValues() {
  return {
    consumption: read('consumption', 'Consumo', 1000000, { groupThousands: true }),
    tariff: read('tariff', 'Tarifa', 100),
    days: read('days', 'Dias do período', 62, { min: 1, whole: true })
  };
}
function efficiencyValues(bill) {
  const led = $('led-on').checked ? {
    quantity: read('led-qty', 'Quantidade de lâmpadas', 1000, { min: 1, whole: true }),
    oldWatts: read('led-old', 'Potência atual', 10000, { groupThousands: true }),
    newWatts: read('led-new', 'Potência nova', 10000, { groupThousands: true }),
    hours: read('led-hours', 'Uso diário das lâmpadas', 24),
    cost: read('led-cost', 'Custo da troca', 1000000, { groupThousands: true })
  } : null;
  const shower = $('shower-on').checked ? {
    watts: read('shower-power', 'Potência do chuveiro', 100000, { groupThousands: true }),
    current: read('shower-current', 'Tempo de banho atual', 1440),
    minutes: read('shower-minutes', 'Tempo de banho a reduzir', 1440)
  } : null;
  return efficiencyScenario(bill, led, shower);
}
function solarValues() {
  return {
    power: read('solar-power', 'Potência solar', 1000),
    hours: read('solar-hours', 'Horas de sol pico', 12),
    performance: read('solar-performance', 'Desempenho', 100),
    credit: read('solar-credit', 'Fração compensável', 100),
    investment: read('solar-investment', 'Investimento inicial', 100000000, { groupThousands: true }),
    cost: read('solar-cost', 'Custos no período', 1000000, { groupThousands: true })
  };
}
function update() {
  $('led-fields').hidden = !$('led-on').checked;
  $('shower-fields').hidden = !$('shower-on').checked;
  const bill = tryRead(billValues, 'bill-error');
  const list = renderDevices(bill);
  const efficiency = bill ? tryRead(() => efficiencyValues(bill), 'eff-error') : null;
  const solarOptions = bill ? tryRead(solarValues, 'solar-error') : null;
  if (!bill) {
    feedback('eff-error', 'Confira os dados da conta para calcular este cenário.');
    feedback('solar-error', 'Confira os dados da conta para calcular este cenário.');
  }
  const solar = solarOptions ? solarScenario(bill, solarOptions) : null;
  const combined = solarOptions && efficiency ?
    solarScenario({ ...bill, consumption: efficiency.remaining }, solarOptions) : null;
  current = { bill, list, efficiency, solar, combined };
  renderBill(bill, list);
  renderComparison(bill, efficiency, solar, combined);
  renderTips();
  if (activeQuestion) answerQuestion(activeQuestion);
  if (socialRequested) renderSocial();
}

function renderDevices(bill) {
  const rows = [];
  const list = devices.map(device => {
    try {
      return { ...device, amount: bill ? deviceConsumption(device, bill.days) : null };
    } catch (error) {
      return { ...device, amount: null, issue: error.message };
    }
  });
  for (const [index, device] of list.entries()) {
    const row = element('tr');
    const name = element('th', device.name);
    name.scope = 'row';
    row.append(name);
    const details = device.mode === 'power' ?
      [`${precision.format(device.watts)} W`, `${precision.format(device.hours)} h`] :
      [dash, 'Consumo informado'];
    const monthlyCost = device.amount === null ? dash : money(device.amount * bill.tariff);
    const values = [...details, device.quantity, device.amount === null ? dash : energy(device.amount), monthlyCost];
    for (const [column, label] of ['Potência', 'Uso por dia', 'Quantidade', 'Consumo', 'Custo'].entries()) {
      const cell = element('td', values[column]);
      cell.dataset.label = label;
      row.append(cell);
    }
    const cell = element('td', undefined, 'row-actions-cell');
    const actions = element('div', undefined, 'row-actions');
    for (const [label, action] of [['Editar', 'edit'], ['Remover', 'remove']]) {
      const button = element('button', label);
      button.type = 'button';
      button.dataset.action = action;
      button.dataset.index = index;
      button.setAttribute('aria-label', `${label} ${device.name}`);
      actions.append(button);
    }
    cell.append(actions);
    row.append(cell);
    rows.push(row);
  }
  if (rows.length === 0) {
    const row = element('tr');
    const cell = element('td', 'Adicione um equipamento para ver quanto ele consome.', 'empty-table');
    cell.colSpan = 7;
    row.append(cell);
    rows.push(row);
  }
  const focus = document.activeElement;
  const focusedIndex = focus?.dataset.index;
  const focusedAction = focus?.dataset.action;
  $('device-rows').replaceChildren(...rows);
  if (focusedAction) {
    ($('device-rows').querySelector(`[data-action="${focusedAction}"][data-index="${focusedIndex}"]`) ?? $('add-device')).focus();
  }
  return list;
}
function renderBill(bill, list) {
  const issue = list.find(device => device.issue)?.issue;
  const total = list.reduce((sum, device) => sum + (device.amount ?? 0), 0);
  const balance = bill ? bill.consumption - total : 0;
  const over = balance < -0.005;
  const note = issue ?? (bill && over ?
    'Os equipamentos listados somam mais que o consumo informado. Revise as potências, o tempo de uso e os kWh de referência.' : '');
  feedback('device-note', note);
  write('bill-cost', bill ? money(bill.consumption * bill.tariff) : dash);
  write('bill-formula', bill ? `${energy(bill.consumption)} × ${tariffFormat.format(bill.tariff)}/kWh` : 'Preencha os dados da conta para calcular.');
  write('device-total', bill && !issue ? energy(total) : dash);
  write('remaining-label', over && !issue ? 'Excesso na estimativa' : 'Consumo restante');
  write('remaining-total', bill && !issue ? energy(Math.abs(balance)) : dash);
}

function renderComparison(bill, efficiency, solar, combined) {
  write('eff-saving', efficiency ? money(efficiency.savings) : dash);
  write('eff-energy', efficiency ? `${energy(Math.abs(efficiency.reduction))} de ${efficiency.reduction < 0 ? 'aumento' : 'redução'} no consumo` : '');
  write('solar-saving', solar ? money(solar.savings) : dash);
  write('solar-energy', solar ? `${energy(solar.generation)} de geração prevista` : '');
  write('comparison-days', bill ? `${bill.days} ${bill.days === 1 ? 'dia' : 'dias'}` : 'um período');
  const payback = scenario => {
    if (!scenario) return dash;
    if (scenario.payback === null) return 'Sem retorno';
    if (scenario.investment === 0) return 'Sem investimento';
    if (scenario.payback < 0.05) return 'Menos de 0,1 mês';
    return `${scenario.payback.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} meses`;
  };
  const comparison = [
    ['Redução física do consumo', efficiency ? energy(efficiency.reduction) : dash, solar ? energy(0) : dash],
    ['Geração solar prevista', efficiency ? energy(0) : dash, solar ? energy(solar.generation) : dash],
    ['Compensação estimada', efficiency ? energy(0) : dash, solar ? energy(solar.credited) : dash],
    ['Investimento inicial', efficiency ? money(efficiency.investment) : dash, solar ? money(solar.investment) : dash],
    ['Retorno simples', payback(efficiency), payback(solar)]
  ];
  $('compare-rows').replaceChildren(...comparison.map(([label, left, right]) => {
    const row = element('tr');
    const header = element('th', label);
    header.scope = 'row';
    row.append(header, element('td', left), element('td', right));
    return row;
  }));
  const bars = [
    ['Conta de referência', bill ? bill.consumption * bill.tariff : null, 'baseline'],
    ['Com eficiência', efficiency?.periodCost, 'efficiency'],
    ['Com solar', solar?.periodCost, 'solar'],
    ['Eficiência + solar', combined?.periodCost, 'combined']
  ];
  const scale = Math.max(1, ...bars.map(([, value]) => value ?? 0));
  $('compare-chart').replaceChildren(...bars.map(([label, value, variant]) => {
    const row = element('div', undefined, `chart-row ${variant}`);
    const track = element('dd', undefined, 'chart-track');
    track.setAttribute('aria-hidden', 'true');
    const bar = element('i');
    bar.style.width = `${(value ?? 0) / scale * 100}%`;
    track.append(bar);
    row.append(element('dt', label), track, element('dd', value == null ? dash : money(value)));
    return row;
  }));
}

function openDevice(index = null) {
  editIndex = index;
  const selected = devices[index];
  $('device-form').reset();
  clearInvalid($('device-form'));
  feedback('device-error');
  write('dialog-title', selected ? 'Editar equipamento' : 'Adicionar equipamento');
  $('device-name').value = selected?.name ?? '';
  $('device-mode').value = selected?.mode ?? 'power';
  $('device-quantity').value = selected?.quantity ?? '1';
  $('device-watts').value = String(selected?.watts ?? '').replace('.', ',');
  $('device-hours').value = String(selected?.hours ?? '').replace('.', ',');
  $('device-days').value = selected?.days ?? '';
  $('device-kwh').value = String(selected?.kwh ?? '').replace('.', ',');
  syncDeviceMode();
  $('device-dialog').showModal();
  $('device-name').focus();
}
function syncDeviceMode() {
  const direct = $('device-mode').value === 'direct';
  $('power-fields').hidden = direct;
  $('direct-fields').hidden = !direct;
  clearInvalid($('device-form'));
  feedback('device-error');
}
function saveDevice(event) {
  event.preventDefault();
  const device = tryRead(() => {
    const name = $('device-name').value.trim();
    if (!name) {
      $('device-name').setAttribute('aria-invalid', 'true');
      throw new Error('Informe o nome do equipamento.');
    }
    $('device-name').removeAttribute('aria-invalid');
    const mode = $('device-mode').value;
    const quantity = read('device-quantity', 'Quantidade', 1000, { whole: true, min: 1 });
    if (mode === 'direct') return { name, mode, quantity, kwh: read('device-kwh', 'Consumo em kWh', 1000000, { groupThousands: true }) };
    return { name, mode, quantity, watts: read('device-watts', 'Potência', 100000, { groupThousands: true }),
      hours: read('device-hours', 'Horas de uso', 24),
      days: $('device-days').value.trim() ?
        read('device-days', 'Dias de uso', current.bill?.days ?? 62, { whole: true, min: 1 }) : null };
  }, 'device-error');
  if (!device) {
    $('device-form').querySelector('[aria-invalid=true]')?.focus();
    return;
  }
  if (editIndex === null) devices.push(device);
  else devices[editIndex] = device;
  $('device-dialog').close();
  markCustom();
  update();
  write('announcer', `${device.name} salvo.`);
}

function topDevice() {
  return current.list.filter(item => item.amount > 0).reduce((top, item) =>
    !top || item.amount > top.amount ? item : top, null);
}
function equipmentTip(name) {
  const normalized = normalize(name);
  if (/chuveir|ducha/.test(normalized)) return 'Reduza alguns minutos do banho, se isso for confortável para a família.';
  if (/geladeir|freezer|refrigerad/.test(normalized)) return 'Evite abrir a porta sem necessidade e confira a vedação. Mantenha o aparelho ligado para conservar os alimentos.';
  if (/lampad|ilumin/.test(normalized)) return 'Aproveite a luz natural e avalie trocar as lâmpadas mais usadas por LED com luminosidade equivalente.';
  if (/ar.?condicion/.test(normalized)) return 'Mantenha o filtro limpo e feche portas e janelas durante o uso.';
  return 'Revise o tempo de uso e desligue quando o aparelho estiver ocioso e puder ser desligado com segurança.';
}
function renderTips() {
  const top = topDevice();
  const efficiency = current.efficiency;
  const tips = [
    ['MAIOR CONSUMO LISTADO', top ? top.name : 'Identifique o maior consumo', top ?
      `${energy(top.amount)} no período. ${equipmentTip(top.name)}` :
      'Adicione equipamentos para descobrir quais concentram mais consumo na sua casa.'],
    ['SEM INVESTIMENTO', 'Ajuste o tempo de banho', efficiency?.showerReduction > 0 ?
      `A redução de tempo simulada pode economizar ${energy(efficiency.showerReduction)} e ${money(efficiency.showerReduction * current.bill.tariff)} no período.` :
      'Se você usa chuveiro elétrico, teste reduzir alguns minutos de banho. Mantenha o uso de equipamentos essenciais para a saúde.'],
    ['APOIO SOCIAL', 'Confira seus direitos', 'Consulte a Tarifa Social e o Desconto Social. O CRAS pode orientar sobre o CadÚnico e a distribuidora pode verificar o benefício na conta.']
  ];
  $('tips').replaceChildren(...tips.map(([tag, heading, body]) => {
    const card = element('article', undefined, 'tip-card');
    card.append(element('span', tag, 'tip-tag'), element('h3', heading), element('p', body));
    return card;
  }));
}

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}
function showAnswer(message, references = []) {
  $('answer-panel').hidden = false;
  write('answer', message);
  $('answer-sources').replaceChildren(...references.map(([label, url]) => {
    const link = element('a', label);
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }));
}

function answerQuestion(question) {
  const input = normalize(question);
  const { bill, efficiency, solar, combined } = current;
  const top = topDevice();
  if (/desconto social/.test(input)) {
    showAnswer('O Desconto Social isenta a parcela da Conta de Desenvolvimento Energético (CDE) para famílias inscritas no CadÚnico que atendam aos critérios de renda e consumam até 120 kWh no mês. Consulte a sua distribuidora.', [sources.social, sources.register]);
  } else if (/tarifa social|cad.?unico|cras|beneficio|\bbpc\b/.test(input)) {
    showAnswer('Famílias elegíveis podem ter gratuidade na tarifa dos primeiros 80 kWh pela Tarifa Social. Procure o CRAS para atualizar o CadÚnico ou a distribuidora para verificar sua fatura. Consulte a pré-triagem na seção de apoio.', [sources.social, sources.register]);
  } else if (/compar|vale a pena|melhor|compensa|combina|junt/.test(input)) {
    if (!efficiency || !solar) {
      showAnswer('Confira os dados da conta e dos dois cenários para comparar. Abra os ajustes de eficiência e energia solar para revisar os valores.');
      return;
    }
    const advice = efficiency.showerReduction > 0 ?
      `Comece pela redução do tempo de banho, que pode poupar ${energy(efficiency.showerReduction)} sem investimento.` :
      'Considere ajustes de uso sem custo e compare a luminosidade antes de trocar lâmpadas.';
    showAnswer(`Em ${bill.days} dias, a eficiência deixa o consumo em ${energy(efficiency.remaining)}, com economia estimada de ${money(efficiency.savings)} e investimento de ${money(efficiency.investment)}. O solar gera cerca de ${energy(solar.generation)}, com economia líquida estimada de ${money(solar.savings)} e investimento de ${money(solar.investment)}. Com as duas medidas, a parcela simulada é de ${money(combined.periodCost)}, após recalcular a compensação. ${advice} Para solar, confira telhado, irradiação, orçamento e regras da distribuidora. Os valores são estimativas do cenário.`, [sources.efficiency, sources.solar, sources.atlas]);
  } else if (/solar|fotovoltaic|placa/.test(input)) {
    showAnswer(solar ? `Neste cenário, o sistema gera cerca de ${energy(solar.generation)}, com compensação estimada de ${energy(solar.credited)} e economia líquida de ${money(solar.savings)} em ${bill.days} dias. Consulte a irradiação local e as condições do imóvel, da distribuidora e do orçamento antes de investir.` :
      'Revise os dados da conta e do cenário fotovoltaico para estimar a geração.', [sources.solar, sources.atlas]);
  } else if (/mais consum|mais gast|aparelho|equipamento/.test(input)) {
    showAnswer(top ? `${top.name} é o item com maior consumo estimado entre os aparelhos válidos: ${energy(top.amount)}, ou ${money(top.amount * bill.tariff)} em ${bill.days} dias. ${equipmentTip(top.name)}` :
      'Adicione equipamentos e confira os dados da conta para identificar o item que mais consome.', [sources.efficiency]);
  } else if (/eficien|economiz|economia|\bled\b|lampad|banho|chuveir/.test(input)) {
    showAnswer(efficiency ? `As medidas de eficiência estimam uma variação de ${energy(-efficiency.reduction)} no consumo e economia de ${money(efficiency.savings)} em ${bill.days} dias. Ao trocar lâmpadas, procure luminosidade equivalente. Se for confortável para a família, reduza alguns minutos de banho.` :
      'Revise os dados da conta e os parâmetros de eficiência para calcular a economia.', [sources.efficiency, sources.led]);
  } else if (/consumo|conta|custo|tarifa|kwh/.test(input) && bill) {
    showAnswer(`Multiplicando ${energy(bill.consumption)} pela tarifa de ${tariffFormat.format(bill.tariff)}/kWh, a parcela de energia fica em ${money(bill.consumption * bill.tariff)}. A fatura pode ter outras cobranças ou descontos.`, [sources.tariffs]);
  } else {
    showAnswer('Posso explicar os números da conta, identificar o aparelho que mais consome, comparar eficiência e solar ou orientar sobre benefícios. Experimente perguntar “O que mais consome?”.');
  }
}

function renderSocial() {
  const result = tryRead(() => socialPath({
    income: read('social-income', 'Renda familiar', 100000000, { groupThousands: true }),
    people: read('social-people', 'Pessoas na família', 1000, { whole: true, min: 1 }),
    cad: $('social-cad').value,
    bpc: $('social-bpc').checked,
    medical: $('social-medical').checked,
    consumption: current.bill?.consumption ?? null,
    days: current.bill?.days ?? null
  }), 'social-result');
  $('social-result').classList.toggle('error', !result);
  if (!result) return;
  const messages = {
    'tarifa-social': 'Vale consultar a Tarifa Social. Confirme seus dados e os critérios da categoria na distribuidora. A gratuidade da tarifa se aplica aos primeiros 80 kWh do mês.',
    'cadastro': 'Procure o CRAS ou posto do CadÚnico para verificar, fazer ou atualizar o cadastro. Leve os documentos da família e um comprovante de residência, se tiver.',
    'desconto-social': 'Pela renda e pelo CadÚnico informado, vale conferir o Desconto Social com a distribuidora.',
    'distribuidora': 'Consulte a distribuidora ou o CRAS para verificar condições específicas e outros programas disponíveis.'
  };
  const checks = {
    'ate-limite': ' O consumo informado está na faixa de referência de até 120 kWh.',
    'acima-limite': ' O consumo informado supera a referência de 120 kWh no mês.',
    'verificar': ' Confira na fatura mensal o limite de 120 kWh.'
  };
  const consumptionNote = checks[result.consumptionCheck] ?? '';
  const medicalNote = $('social-medical').checked ?
    ' Pergunte à distribuidora sobre a documentação para tratamento contínuo e mantenha os equipamentos essenciais em uso.' : '';
  feedback('social-result', `Renda por pessoa: ${money(result.perPerson)}. ${messages[result.path]}${consumptionNote}${medicalNote}`);
}

for (const id of Object.keys(defaults)) {
  $(id).addEventListener('input', () => { markCustom(); update(); });
}
for (const id of ['led-on', 'shower-on']) {
  $(id).addEventListener('change', () => { markCustom(); update(); });
}
$('reset-example').addEventListener('click', () => loadExample(true));
$('add-device').addEventListener('click', () => openDevice());
$('device-rows').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const index = Number(button.dataset.index);
  if (button.dataset.action === 'edit') openDevice(index);
  else {
    const [device] = devices.splice(index, 1);
    markCustom();
    update();
    write('announcer', `${device.name} removido.`);
  }
});
$('device-mode').addEventListener('change', syncDeviceMode);
for (const id of ['close-dialog', 'cancel-dialog']) {
  $(id).addEventListener('click', () => $('device-dialog').close());
}
$('device-form').addEventListener('submit', saveDevice);
$('social-form').addEventListener('submit', event => {
  event.preventDefault();
  socialRequested = true;
  renderSocial();
  $('social-form').querySelector('[aria-invalid=true]')?.focus();
});
$('social-form').addEventListener('input', () => {
  if (socialRequested) renderSocial();
});
$('assistant-form').addEventListener('submit', event => {
  event.preventDefault();
  activeQuestion = $('question').value.trim();
  if (activeQuestion) answerQuestion(activeQuestion);
  else showAnswer('Digite uma pergunta ou escolha uma das sugestões.');
});
for (const button of document.querySelectorAll('[data-question]')) {
  button.addEventListener('click', () => {
    activeQuestion = button.dataset.question;
    $('question').value = activeQuestion;
    answerQuestion(activeQuestion);
  });
}
loadExample();
