
const values = fetch('https://topsmm.in/api/v2?key=d47bf4c56c00880dc987c1debf729b84b86a0f2d&action=services', {
  method: 'GET',
}).then(res => res.json()).then(data => {
  const set = new Map();
  data.forEach((service) => {
    set.set(service.type, service);
  });
  console.log(Array.from(set));
});