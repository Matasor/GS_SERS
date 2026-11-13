export const MINIMUM_WAGE_2026 = 1621;

export function numberInRange(raw, label, { min = 0, max, whole = false, groupThousands = false }) {
  const value = String(raw).trim();
  const simple = /^-?\d+(?:[.,]\d+)?$/;
  const grouped = /^-?[1-9]\d{0,2}(?:\.\d{3})+(?:,\d+)?$/;
  const isGrouped = grouped.test(value) && (value.includes(',') || groupThousands || whole || !simple.test(value));
  const normalized = isGrouped ? value.replaceAll('.', '').replace(',', '.') : value.replace(',', '.');
  const result = simple.test(value) || isGrouped ? Number(normalized) : NaN;
  if (!Number.isFinite(result) || result < min || result > max || (whole && !Number.isInteger(result))) {
    const qualifier = whole ? 'um número inteiro' : 'um número';
    const format = number => number.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
    throw new Error(`${label}: informe ${qualifier} entre ${format(min)} e ${format(max)}.`);
  }
  return result === 0 ? 0 : result;
}

export function deviceConsumption(device, days) {
  if (device.mode === 'direct') return device.kwh * device.quantity;
  const useDays = device.days ?? days;
  if (useDays > days) throw new Error(`${device.name}: ajuste os dias de uso para até ${days}.`);
  return device.watts / 1000 * device.hours * useDays * device.quantity;
}

export function efficiencyScenario({ consumption, tariff, days }, led, shower) {
  if (shower && shower.minutes > shower.current) {
    throw new Error('O tempo de banho a reduzir precisa ser menor ou igual ao uso atual.');
  }
  const lightingBefore = led ? led.oldWatts / 1000 * led.hours * days * led.quantity : 0;
  const lightingAfter = led ? led.newWatts / 1000 * led.hours * days * led.quantity : 0;
  const showerBefore = shower ? shower.watts / 1000 * shower.current / 60 * days : 0;
  const showerReduction = shower ? shower.watts / 1000 * shower.minutes / 60 * days : 0;
  if (lightingBefore + showerBefore > consumption + 1e-8) {
    throw new Error('O consumo atual de lâmpadas e chuveiro neste cenário supera o total da conta. Ajuste os dados ou desmarque uma medida.');
  }
  const lightingReduction = lightingBefore - lightingAfter;
  const reduction = lightingReduction + showerReduction;
  const remaining = Math.max(0, consumption - reduction);
  const savings = (consumption - remaining) * tariff;
  const investment = led?.cost ?? 0;
  return { reduction, remaining, savings, investment, lightingReduction, showerReduction,
    periodCost: remaining * tariff, payback: simplePayback(investment, savings, days) };
}

export function solarScenario({ consumption, tariff, days }, solar) {
  const generation = solar.power * solar.hours * days * solar.performance / 100;
  const credited = Math.min(consumption, generation) * solar.credit / 100;
  const savings = credited * tariff - solar.cost;
  return { generation, credited, savings, investment: solar.investment,
    periodCost: Math.max(0, consumption - credited) * tariff + solar.cost,
    payback: simplePayback(solar.investment, savings, days) };
}

function simplePayback(investment, savings, days) {
  return savings > 0 ? investment / savings * days / 30 : null;
}

export function socialPath({ income, people, cad, bpc, medical, consumption, days }) {
  const perPerson = income / people;
  const registered = cad === 'yes';
  if (bpc || (registered && perPerson <= MINIMUM_WAGE_2026 / 2) ||
      (registered && medical && income <= 3 * MINIMUM_WAGE_2026)) {
    return { perPerson, path: 'tarifa-social' };
  }
  if (!registered) return { perPerson, path: 'cadastro' };
  if (perPerson <= MINIMUM_WAGE_2026) {
    const consumptionCheck = consumption === null || days < 27 || days > 33 ? 'verificar' :
      (consumption <= 120 ? 'ate-limite' : 'acima-limite');
    return { perPerson, path: 'desconto-social', consumptionCheck };
  }
  return { perPerson, path: 'distribuidora' };
}
