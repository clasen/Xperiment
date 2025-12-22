import Xperiment from '../index.js';

console.log('🚀 Súper Simple - Un solo experimento\n');

// El caso más simple: un experimento sin nombre
const exp = new Xperiment('user123', {
  cases: ['version_a', 'version_b']
});

const variant = await exp.case();
console.log(`✅ Usuario asignado a: ${variant}`);

// Registrar acción
await exp.hit();
console.log('✅ Hit registrado');

// Ver reporte (usa 'default' como nombre)
const report = await Xperiment.report('default');
console.log('\n📊 Reporte:');
console.log(`   Total usuarios: ${report.totalUsers}`);
console.log(`   Mejor caso: ${report.bestCase || 'N/A'}`);

console.log('\n💡 No necesitaste:');
console.log('   - Llamar a define()');
console.log('   - Especificar un nombre de experimento');
console.log('   - Usar await en el constructor');
console.log('\n   ¡Solo crea y usa! 🎉');

