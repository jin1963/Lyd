
let web3;
let contract;
let accounts = [];
let tokenContract;
let selectedTierDays = 180;

window.addEventListener("load", async () => {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    await window.ethereum.enable();
    accounts = await web3.eth.getAccounts();
    contract = new web3.eth.Contract(contractABI, contractAddress);
    const tokenAddress = await contract.methods.token().call();
    tokenContract = new web3.eth.Contract([{
      "constant": false,
      "inputs": [
        {
          "name": "spender",
          "type": "address"
        },
        {
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [
        {
          "name": "",
          "type": "bool"
        }
      ],
      "type": "function"
    }, {
      "constant": true,
      "inputs": [
        {
          "name": "owner",
          "type": "address"
        },
        {
          "name": "spender",
          "type": "address"
        }
      ],
      "name": "allowance",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "type": "function"
    }], tokenAddress);

    document.getElementById("app").innerHTML = `
      <p><strong>Wallet:</strong> ${accounts[0]}</p>
      <p><strong>Tier:</strong>
        <button onclick="selectTier(180)">180d</button>
        <button onclick="selectTier(240)">240d</button>
        <button onclick="selectTier(365)">365d</button>
      </p>
      <p><input type='number' id='amount' placeholder='Amount to stake (LYDIA)'/></p>
      <button onclick='stake()'>📥 Stake</button>
      <button onclick='claim()'>🎁 Claim</button>
      <button onclick='withdraw()'>📤 Withdraw</button>
      <div id='dashboard'></div>
      <canvas id="tvlChart" width="400" height="200"></canvas>
    `;
    refreshDashboard();
  } else {
    alert("Please install MetaMask.");
  }
});

function selectTier(days) {
  selectedTierDays = days;
  alert("Selected Tier: " + days + " days");
}

async function stake() {
  const amount = document.getElementById("amount").value;
  if (!amount || !contract) return;
  const amountWei = web3.utils.toWei(amount, "ether");

  const allowance = await tokenContract.methods.allowance(accounts[0], contract.options.address).call();
  if (parseInt(allowance) < parseInt(amountWei)) {
    await tokenContract.methods.approve(contract.options.address, amountWei).send({ from: accounts[0] });
  }

  await contract.methods.stake(amountWei).send({ from: accounts[0] });
  refreshDashboard();
}

async function claim() {
  await contract.methods.claimReward().send({ from: accounts[0] });
  refreshDashboard();
}

async function withdraw() {
  await contract.methods.withdraw().send({ from: accounts[0] });
  refreshDashboard();
}

async function refreshDashboard() {
  const stakeInfo = await contract.methods.stakes(accounts[0]).call();
  const reward = await contract.methods.calculateReward(accounts[0]).call();
  const rewardPerSec = await contract.methods.rewardRatePerSecond().call();

  const unlockTime = parseInt(stakeInfo.startTime) + (selectedTierDays * 86400);
  const timeNow = Math.floor(Date.now() / 1000);
  const secondsLeft = unlockTime - timeNow;
  const countdown = secondsLeft > 0 ? secondsLeft + " sec" : "Unlocked";

  document.getElementById("dashboard").innerHTML = `
    <p><strong>Staked:</strong> ${web3.utils.fromWei(stakeInfo.amount)} LYDIA</p>
    <p><strong>Reward:</strong> ${web3.utils.fromWei(reward)} LYDIA</p>
    <p><strong>Reward/sec:</strong> ${web3.utils.fromWei(rewardPerSec)} LYDIA</p>
    <p><strong>Unlocks in:</strong> ${countdown}</p>
  `;

  drawTVLChart();
}

function drawTVLChart() {
  const ctx = document.getElementById('tvlChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'],
      datasets: [{
        label: 'TVL (Mock)',
        data: [1200, 1350, 1400, 1600, 2000],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}
