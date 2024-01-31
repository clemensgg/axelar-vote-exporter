# axelar-voter

### Exporter

This fork of [`hoodrunio/axelar-voter`](https://github.com/hoodrunio/axelar-voter) exposes prometheus metrics for monitoring EVM votes of axelar validators.  

Configure via 

Metrics:
```
# HELP axelarevm_maintainer_status Chain maintainer status of each maintainer for each evm chain
# TYPE axelarevm_maintainer_status gauge

# HELP axlearevm_poll_status Poll status: 0=pending, 1=confirmed, 2=failed
# TYPE axlearevm_poll_status gauge

# HELP axlearevm_vote_status Vote status for each poll and validator: 0=pending, 1=yes, 2=no
# TYPE axlearevm_vote_status gauge
```

### Install Node.js
```
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash - &&\
sudo apt-get install -y nodejs
```

```
git clone https://github.com/cryptocrew-validators/axelar-vote-exporter.git
cd axelar-vote-exporter
```

### Install deps

```
npm install
```
### Push prisma
```
npx prisma db push
```

Edit env file: `cp .env.sample .env && nano .env`

### Run metrics server
```
node index.js
```
default port: 3009