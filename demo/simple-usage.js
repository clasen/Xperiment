import Xperiment from '../index.js';
import { resolve } from 'node:path';

Xperiment.configure({ path: resolve(import.meta.dirname, '..', 'db') });

console.log('🎯 Demo: Diferentes formas de uso\n');

// ========================================
// FORMA 1: Constructor directo (más simple para un solo experimento)
// ========================================
console.log('1️⃣  Constructor directo con cases:');
const exp1 = new Xperiment('user1', {
  cases: ['option_a', 'option_b']
});
const case1 = await exp1.case();
console.log(`   Caso asignado: ${case1}`);
await exp1.hit();
console.log('   ✅ Hit registrado\n');

// ========================================
// FORMA 2: Constructor con nombre de experimento
// ========================================
console.log('2️⃣  Constructor con nombre específico:');
const exp2 = new Xperiment('user2', {
  name: 'my-test',
  cases: { variant_a: 70, variant_b: 30 }
});
const case2 = await exp2.case();
console.log(`   Caso asignado: ${case2}\n`);

// ========================================
// FORMA 3: get() con cases inline (define y obtiene en un paso)
// ========================================
console.log('3️⃣  get() con cases inline:');
const exp3 = await Xperiment.get('user3', 'quick-test', ['a', 'b', 'c']);
const case3 = await exp3.case();
console.log(`   Caso asignado: ${case3}\n`);

// ========================================
// FORMA 4: define() primero, luego get() (mejor para múltiples usuarios)
// ========================================
console.log('4️⃣  define() + get() (recomendado para producción):');
await Xperiment.define(['control', 'treatment'], 'production-test');

const exp4a = await Xperiment.get('user4a', 'production-test');
const exp4b = await Xperiment.get('user4b', 'production-test');

console.log(`   User 4a: ${await exp4a.case()}`);
console.log(`   User 4b: ${await exp4b.case()}\n`);

// ========================================
// FORMA 5: Experimento por defecto (sin nombre)
// ========================================
console.log('5️⃣  Experimento por defecto (sin nombre):');
const exp5 = new Xperiment('user5', {
  cases: ['yes', 'no']
});
const case5 = await exp5.case();
console.log(`   Caso asignado: ${case5}`);
console.log(`   Nombre del experimento: "${exp5.name}"\n`);

// ========================================
// FORMA 6: get() con objeto de opciones
// ========================================
console.log('6️⃣  get() con objeto de opciones:');
const exp6 = await Xperiment.get('user6', {
  name: 'flexible-test',
  cases: ['red', 'green', 'blue']
});
const case6 = await exp6.case();
console.log(`   Caso asignado: ${case6}\n`);

console.log('✨ Todas las formas funcionan correctamente!');
console.log('\n📌 Recomendación:');
console.log('   - Para un solo experimento simple: usa el constructor directo');
console.log('   - Para múltiples usuarios: usa define() + get()');
console.log('   - Para experimento por defecto: omite el nombre (usa "default")');
