angular
  .module('testApp')
  .controller('HomeController', HomeController);


function HomeController($scope) {
  var vm = this;

  vm.locationData = [
    {
      id: 1,
      name: 'Smashburger texas Austin north'
    },
    {
      id: 2,
      name: 'Smashburger texas Austin south'
    },
    {
      id: 3,
      name: 'Smashburger texas San marcos'
    },
    {
      id: 4,
      name: 'Smashburger texas Waco',
      menus: [
        {
          id: 1,
          name: 'menu One',
          items: [
            {
              id: 1,
              name: 'Item One',
              price: '12.00'
            },
            {
              id: 2,
              name: 'Item two',
              price: '12.00'
            }
          ]
        },
        {
          id: 2,
          name: 'menu Two'
        },
        {
          id: 3,
          name: 'menu Three'
        }
      ]
    }
  ];
}
