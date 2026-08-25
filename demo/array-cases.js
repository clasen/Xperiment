import Xperiment from '../index.js';
import { resolve } from 'node:path';

Xperiment.configure({ path: resolve(import.meta.dirname, '..', 'db') });

console.log('🧪 Demo: Array cases with equal probability\n');

// Definir experimentos con sus casos (ahora se persisten en DB)
await Xperiment.define(['headline_a', 'headline_b', 'headline_c', 'headline_d'], 'headline-test');
await Xperiment.define({ green: 25, blue: 25, red: 50 }, 'button-test');
await Xperiment.define(['buy_now', 'add_to_cart', 'learn_more'], 'cta-test');

console.log('✓ Experimentos definidos y persistidos en DB\n');

// Ejemplo 1: Usar get() - carga automáticamente desde DB
const exp1 = await Xperiment.get('user123', 'headline-test');
console.log('Experimento headline-test:');
console.log('Cases configurados:', exp1.cases);
console.log('Case names:', exp1.caseNames);

const assignedCase1 = await exp1.case();
console.log(`Caso asignado a user123: ${assignedCase1}\n`);

// Ejemplo 2: Otro experimento con pesos personalizados
const exp2 = await Xperiment.get('user456', 'button-test');
console.log('Experimento button-test (con pesos):');
console.log('Cases configurados:', exp2.cases);

const assignedCase2 = await exp2.case();
console.log(`Caso asignado a user456: ${assignedCase2}\n`);

// Ejemplo 3: Tercer usuario
const exp3 = await Xperiment.get('user789', 'cta-test');
const assignedCase3 = await exp3.case();
console.log(`Caso asignado a user789: ${assignedCase3}`);

// Registrar un hit
await exp3.hit();
console.log('✅ Hit registrado');

// Ejemplo 4: También puedes usar el constructor directamente si prefieres
const exp4 = new Xperiment('user999', {
  name: 'inline-test',
  cases: ['option_1', 'option_2']
});
const assignedCase4 = await exp4.case();
console.log(`\nCaso asignado inline a user999: ${assignedCase4}`);

console.log('\n✨ Demo completado!');
