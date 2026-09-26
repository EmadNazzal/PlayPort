import { createApp } from './app.js';
import { config } from './shared/config.js';

createApp().listen(config.PORT, () => {
  console.log(`PlayPort API listening on http://localhost:${config.PORT}`);
});
