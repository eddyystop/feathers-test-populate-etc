
const getClientParams = () => hook => {
  const query = hook.params.query || {};
  
  if (query._clientParams) {
    // todo remove reserved keywords from _clientParams
    Object.assign(hook.params, query._clientParams);
    delete query._clientParams;
  }
  
  return hook;
};

module.exports = {
  getClientParams,
};