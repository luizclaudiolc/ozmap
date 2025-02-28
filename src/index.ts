import './database';
import server from './server';

server.listen(3003, () => {
  console.log('Server running on port 3003');
});
