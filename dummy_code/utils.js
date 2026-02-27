// Utils with various bugs and bad practices

function calculateTotal(items) {
  let total = 0;

  // Off-by-one error
  for (let i = 0; i <= items.length; i++) {
    total += items[i].price;
  }

  return total;
}

function divideNumbers(a, b) {
  // Missing division by zero check
  return a / b;
}

async function fetchData(url) {
  // Missing try-catch for async operation
  const response = await fetch(url);
  const data = await response.json();
  return data;
}

function processArray(arr) {
  // Mutating input parameter (side effect)
  arr.sort();
  arr.reverse();

  // Unused variable
  const temp = arr[0];

  return arr;
}

function findUser(users, id) {
  // Inefficient - should use find() instead of filter()[0]
  return users.filter((u) => u.id === id)[0];
}

// Memory leak - event listener never removed
function setupListener() {
  document.addEventListener("click", function () {
    console.log("clicked");
  });
}

function getValue(obj) {
  // No null check before accessing nested property
  return obj.data.value.name;
}

// Callback hell
function processData(data, callback) {
  getData(data, function (result1) {
    transformData(result1, function (result2) {
      saveData(result2, function (result3) {
        callback(result3);
      });
    });
  });
}

module.exports = { calculateTotal, divideNumbers, fetchData, processArray };
