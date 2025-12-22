import Xperiment from '../index.js';

console.log('🧪 Demo: Persistencia en DB - Segunda ejecución\n');

// NO definimos los experimentos de nuevo
// Solo intentamos obtenerlos desde DB

try {
  console.log('Intentando cargar experimentos desde DB...\n');
  
  // Si ejecutaste array-cases.js antes, estos experimentos ya están en DB
  const exp1 = await Xperiment.get('user123', 'headline-test');
  console.log('✓ Experimento "headline-test" cargado desde DB');
  console.log('  Cases:', exp1.caseNames);
  
  const exp2 = await Xperiment.get('user456', 'button-test');
  console.log('✓ Experimento "button-test" cargado desde DB');
  console.log('  Cases:', exp2.caseNames);
  
  const exp3 = await Xperiment.get('user789', 'cta-test');
  console.log('✓ Experimento "cta-test" cargado desde DB');
  console.log('  Cases:', exp3.caseNames);
  
  console.log('\n✅ Todos los experimentos se cargaron correctamente desde DB!');
  console.log('Los casos persistieron entre ejecuciones.\n');
  
  // Los usuarios ya tienen casos asignados
  const case1 = await exp1.case();
  const case2 = await exp2.case();
  const case3 = await exp3.case();
  
  console.log('Casos ya asignados (persistidos):');
  console.log(`  user123: ${case1}`);
  console.log(`  user456: ${case2}`);
  console.log(`  user789: ${case3}`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Ejecuta primero: node demo/array-cases.js');
}

