import localtunnel from 'localtunnel';

const PORT = 5000;
const SUBDOMAIN = 'marili-onboarding';

async function startTunnel() {
  try {
    const tunnel = await localtunnel({ port: PORT, subdomain: SUBDOMAIN });
    console.log(`🌐 Public Tunnel Online: ${tunnel.url}`);

    tunnel.on('close', () => {
      console.log('Tunnel connection closed. Reconnecting in 3s...');
      setTimeout(startTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err.message);
      setTimeout(startTunnel, 3000);
    });
  } catch (err) {
    console.error('Failed to establish tunnel, retrying in 3s:', err.message);
    setTimeout(startTunnel, 3000);
  }
}

startTunnel();
