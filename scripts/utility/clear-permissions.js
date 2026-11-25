// Script para limpar e resetar permissões no localStorage
// Use isso no console do navegador para testar um clean slate

console.log('🧹 Limpando localStorage antigo...');

// Remove todos os dados de permissão
localStorage.removeItem('users');
localStorage.removeItem('userRecords');
localStorage.removeItem('sessionUser');
localStorage.removeItem('wms_users');
localStorage.removeItem('wms_permissions');

// Remove dados de session também
sessionStorage.removeItem('sessionUser');

console.log('✅ LocalStorage e SessionStorage foram resetados!');
console.log('⚠️ Recarregue a página e faça login novamente para testar com dados frescos.');
console.log('');
console.log('Para testar: entre com MSNV=1118, Password=admin123');
