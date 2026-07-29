import Eureka from 'eureka-js-client';

// Estos valores se pueden sobreescribir con variables de entorno para
// que funcionen tanto en local como dentro de una red de contenedores Docker
// (donde 'localhost' ya no apunta al host correcto).
const APP_HOST = process.env.APP_HOST || 'localhost';
const APP_PORT = Number(process.env.PORT) || 3000;
const EUREKA_HOST = process.env.EUREKA_HOST || 'localhost';
const EUREKA_PORT = Number(process.env.EUREKA_PORT) || 8761;

const client = new Eureka({
  instance: {
    app: 'nextjs-gateway',
    hostName: APP_HOST,
    ipAddr: APP_HOST,
    statusPageUrl: `http://${APP_HOST}:${APP_PORT}/status`,
    port: {
      '$': APP_PORT,
      '@enabled': true,
    },
    vipAddress: 'nextjs-gateway',
    dataCenterInfo: {
      '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
      name: 'MyOwn',
    },
  },
  eureka: {
    host: EUREKA_HOST,
    port: EUREKA_PORT,
    servicePath: '/eureka/apps/',
  },
});

export default client;