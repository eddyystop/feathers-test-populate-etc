
const getClientParams = () => hook => {
  const query = hook.params.query || {};
  
  if (query.$clientParams) {
    if (query.$clientParams.query) {
      delete query.$clientParams.query;
    }
    
    Object.assign(hook.params, query.$clientParams);
    delete query.$clientParams;
  }
  
  return hook;
};

module.exports = {
  getClientParams,
};