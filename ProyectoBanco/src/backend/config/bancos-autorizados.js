/**
 * Lista de bancos autorizados para realizar transferencias interbancarias
 * Cada banco tiene su propia API Key para autenticarse
 */

module.exports = {
  // Dream Wallet - Banco asociado
  'dream_wallet_key_xyz789': {
    name: 'Dream Wallet',
    url: 'http://3.130.29.73:3000/api/interbank/recibir',
    active: true,
    descripcion: 'Sistema bancario Dream Wallet'
  },
  
  // Se pueden agregar más bancos aquí en el futuro
  // 'otro_banco_key_abc123': {
  //   name: 'Otro Banco',
  //   url: 'http://ip:puerto/api/endpoint',
  //   active: true
  // }
};
