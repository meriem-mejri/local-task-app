# AWS Deployment - Complete 3-Tier Architecture (IGL4/GLSI3)

**This guide implements the full project requirements for the AWS evaluation.**

---

## 💡 Deployment Overview

### Direct AWS Deployment Strategy
Deploy directly to AWS with production-ready architecture from the start, fully compliant with all project requirements.

**What we'll deploy:**
- ✅ Step 1: VPC with 8 subnets across 2 Availability Zones
- ✅ Step 2: Security Groups (5 SGs: SG-LB, SG-FE, SG-BE, SG-DB, SG-Bastion)
- ✅ Step 3: Bastion host + EC2 instances
- ✅ Step 4: One Application Load Balancer (shared for frontend and backend)
- ✅ Step 5: Auto Scaling Groups (2-4 instances each)
- ✅ Step 6: RDS PostgreSQL (Multi-AZ for high availability)
- ✅ Step 7: S3 + CloudFront (static content delivery)
- ✅ Step 7: ACM + HTTPS (secure connections)
- ✅ Step 7: CloudWatch + CloudTrail (monitoring & compliance)
- ⚠️ Step 8: ECS/Fargate (optional container migration)

**AWS Architecture Highlights:**
- **High Availability**: Multi-AZ RDS with automatic failover
- **Security**: HTTPS/TLS encryption, Security Groups, Bastion host, CloudTrail logging
- **Performance**: CloudFront CDN for static assets, ALB for load distribution
- **Monitoring**: CloudWatch metrics, alarms, SNS notifications
- **Scalability**: Auto Scaling Groups across 2 AZs

**AWS Cost Estimate ($150-180/month shared, $75-90/student):**
- **RDS Multi-AZ**: ~$35/month (required for HA)
- **EC2 instances** (4x t2.micro with Auto Scaling): ~$30/month
- **Application Load Balancer**: ~$25/month
- **NAT Gateways** (2x): ~$45/month
- **S3 storage** (static assets): ~$5/month
- **CloudFront**: ~$10/month (CDN data transfer)
- **CloudWatch/CloudTrail**: ~$5/month
- **Data transfer**: ~$5/month
- **Total**: ~$160/month

**Deployment Timeline:**
1. **Day 1**: VPC + Security Groups + Bastion - ~2 hours
2. **Day 2**: RDS + EC2 Launch Templates - ~2 hours
3. **Day 3**: Load Balancer + Auto Scaling Groups - ~2 hours
4. **Day 4**: Monitoring + Testing - ~2 hours
5. **Optional**: ECS/Fargate migration - ~2 hours (if budget allows)

---

### Step Dependencies
- **Step 1 (VPC)** → Do first (required for everything)
- **Step 2 (Security Groups)** → Do second
- **Step 3 (Bastion + EC2 Templates)** → Can do in parallel after Step 2
- **Step 4 (Single ALB)** → After Step 2
- **Step 5 (Auto Scaling)** → After Step 3 and Step 4
- **Step 6 (RDS Multi-AZ)** → Can do after Step 2
- **Step 7 (S3/CloudFront + ACM + Monitoring)** → After ALB and Auto Scaling are running
- **Step 8 (ECS)** → Optional, requires containerization

---

### Local Testing First (Recommended)
**Before deploying to AWS, test locally:**
```powershell
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3000/api/tasks
# Test all CRUD operations
```

---

## Architecture Overview

```
Internet
   │
   └─── Application Load Balancer (Public Subnets)
         │
         ├─── Frontend Target Group (Port 80)
         │    └─── Frontend EC2 Instances (Private Subnets A & B)
         │         └─── Auto Scaling Group (2-4 instances)
         │
         └─── Backend Target Group (Port 3000)
              └─── Backend EC2 Instances (Private Subnets A & B)
                   └─── Auto Scaling Group (2-4 instances)
                   └─── RDS PostgreSQL Multi-AZ (Primary + Standby)
```

### Network Architecture
- **VPC**: 10.0.0.0/16
- **8 Subnets** across 2 Availability Zones:
  - 2 Public (ALB, NAT, Bastion)
  - 6 Private (2 for Frontend, 2 for Backend, 2 for RDS)
- **Security**: 5 Security Groups (SG-LB, SG-FE, SG-BE, SG-DB, SG-Bastion)
- **Load Balancing**: Single ALB with 2 target groups (frontend on port 80, backend on port 3000)
- **High Availability**: Multi-AZ deployment, Auto Scaling
- **Monitoring**: CloudWatch, CloudTrail, SNS alerts

---

## Phase 1: Infrastructure Setup (Steps 1-7)

### Step 1: Create VPC and Network Components

#### 1.1 Create VPC
1. Go to **VPC Console** → **Create VPC**
2. Settings:
   - Name: `project-vpc`
   - IPv4 CIDR: `10.0.0.0/16`
   - Enable DNS hostnames: ✅

#### 1.2 Create Subnets (8 total)

**Public Subnets (2)**:
| Name       | CIDR         | AZ           | Type   |
|------------|--------------|--------------|--------|
| public-a   | 10.0.1.0/24  | eu-west-1a   | Public |
| public-b   | 10.0.2.0/24  | eu-west-1b   | Public |

**Private Subnets (6)**:
| Name       | CIDR         | AZ           | Purpose   |
|------------|--------------|--------------|-----------|
| private-fe-a | 10.0.11.0/24 | eu-west-1a | Frontend  |
| private-fe-b | 10.0.12.0/24 | eu-west-1b | Frontend  |
| private-be-a | 10.0.21.0/24 | eu-west-1a | Backend   |
| private-be-b | 10.0.22.0/24 | eu-west-1b | Backend   |
| private-db-a | 10.0.31.0/24 | eu-west-1a | RDS       |
| private-db-b | 10.0.32.0/24 | eu-west-1b | RDS       |

For each subnet:
- Go to **Subnets** → **Create subnet**
- Select VPC: `project-vpc`
- Enter name, AZ, and CIDR
- Enable auto-assign public IPv4 for **public subnets only**

#### 1.3 Create Internet Gateway
1. **VPC** → **Internet Gateways** → **Create IGW**
2. Name: `project-igw`
3. Attach to `project-vpc`

#### 1.4 Create NAT Gateways (2 - one per AZ)
1. **VPC** → **NAT Gateways** → **Create NAT Gateway**
2. **NAT-A**:
   - Subnet: `public-a`
   - Allocate Elastic IP
3. **NAT-B**:
   - Subnet: `public-b`
   - Allocate Elastic IP

#### 1.5 Create Route Tables

**Public Route Table**:
1. Create RT: `public-rt`
2. Add route: `0.0.0.0/0` → IGW
3. Associate with `public-a` and `public-b`

**Private Route Tables** (2):
1. **private-rt-a**:
   - Route: `0.0.0.0/0` → NAT-A
   - Associate: `private-fe-a`, `private-be-a`, `private-db-a`
2. **private-rt-b**:
   - Route: `0.0.0.0/0` → NAT-B
   - Associate: `private-fe-b`, `private-be-b`, `private-db-b`

---

### Step 2: Create Security Groups

**Create 5 Security Groups for production deployment:**

---

### SG-LB (Application Load Balancer)

**Inbound Rules:**
| Type       | Protocol | Port Range | Source Type | Source      | Description                                 |
|------------|----------|-----------|-------------|-------------|---------------------------------------------|
| HTTP       | TCP      | 80        | IPv4        | 0.0.0.0/0   | Allow HTTP from internet                    |
| HTTPS      | TCP      | 443       | IPv4        | 0.0.0.0/0   | Allow HTTPS from internet                   |

**Outbound Rules:**
| Type        | Protocol | Port Range | Destination Type | Destination | Description                           |
|-------------|----------|-----------|------------------|-------------|---------------------------------------|
| All traffic | All      | All       | IPv4             | 0.0.0.0/0   | Allow all outbound traffic            |

---

### SG-FE (Frontend Instances)

**Inbound Rules:**
| Type       | Protocol | Port Range | Source Type     | Source    | Description                                 |
|------------|----------|-----------|-----------------|-----------|---------------------------------------------|
| HTTP       | TCP      | 80        | Security Group  | SG-LB     | Allow traffic from load balancer            |
| SSH        | TCP      | 22        | Security Group  | SG-Bastion| Allow SSH from bastion host                 |

**Outbound Rules:**
| Type        | Protocol | Port Range | Destination Type | Destination | Description                           |
|-------------|----------|-----------|------------------|-------------|---------------------------------------|
| All traffic | All      | All       | IPv4             | 0.0.0.0/0   | Allow all outbound traffic            |

---

### SG-BE (Backend Instances)

**Inbound Rules:**
| Type       | Protocol | Port Range | Source Type     | Source    | Description                                 |
|------------|----------|-----------|-----------------|-----------|---------------------------------------------|
| Custom TCP | TCP      | 3000      | Security Group  | SG-LB     | Allow traffic from load balancer            |
| Custom TCP | TCP      | 3000      | Security Group  | SG-FE     | Allow direct access from frontend           |
| SSH        | TCP      | 22        | Security Group  | SG-Bastion| Allow SSH from bastion host                 |

**Outbound Rules:**
| Type        | Protocol | Port Range | Destination Type | Destination | Description                           |
|-------------|----------|-----------|------------------|-------------|---------------------------------------|
| All traffic | All      | All       | IPv4             | 0.0.0.0/0   | Allow all outbound traffic            |

---

### SG-DB (RDS Database)

**Inbound Rules:**
| Type       | Protocol | Port Range | Source Type     | Source | Description                           |
|------------|----------|-----------|-----------------|--------|---------------------------------------|
| PostgreSQL | TCP      | 5432      | Security Group  | SG-BE  | Allow backend instances to connect    |

**Outbound Rules:**
| Type        | Protocol | Port Range | Destination Type | Destination | Description                           |
|-------------|----------|-----------|------------------|-------------|---------------------------------------|
| All traffic | All      | All       | IPv4             | 0.0.0.0/0   | Allow all outbound (AWS managed)      |

---

### SG-Bastion

**Inbound Rules:**
| Type | Protocol | Port Range | Source Type | Source       | Description                           |
|------|----------|-----------|-------------|--------------|---------------------------------------|
| SSH  | TCP      | 22        | IPv4        | YOUR_IP/32   | Allow SSH from your admin IP only     |

**Outbound Rules:**
| Type        | Protocol | Port Range | Destination Type | Destination | Description                           |
|-------------|----------|-----------|------------------|-------------|---------------------------------------|
| All traffic | All      | All       | IPv4             | 0.0.0.0/0   | Allow all outbound traffic            |

**Note**: Replace `YOUR_IP` with your actual public IP address (find it at https://whatismyip.com)

---

### Step 3: Deploy EC2 Instances

#### 3.1 Launch Bastion Host
1. **EC2** → **Launch Instance**
2. Settings:
   - Name: `bastion-host`
   - AMI: Amazon Linux 2023
   - Instance type: t2.micro
   - **Key pair**: Create new key pair (e.g., `project-key`)
     - **IMPORTANT**: Download `.ppk` file for PuTTY (Windows)
     - If you download `.pem`, convert it to `.ppk` using PuTTYgen (see Testing with PuTTY section)
   - Network: `project-vpc`
   - Subnet: `public-a`
   - Security Group: `SG-Bastion`
   - Auto-assign public IP: **Enable** ✅

**Converting .pem to .ppk for PuTTY:**
1. Download and install PuTTYgen from https://www.putty.org
2. Open PuTTYgen → Load → Select your `.pem` file
3. Click "Save private key" → Save as `.ppk` file
4. Use this `.ppk` file with PuTTY

#### 3.2 Create Frontend Launch Template
1. **EC2** → **Launch Templates** → **Create**
2. Settings:
   - Name: `frontend-template`
   - AMI: Amazon Linux 2023
   - Instance type: t2.micro
   - **Key pair**: Select `project-key`
   - **Network settings**:
     - Don't specify subnet (Auto Scaling Group will handle this)
   - Security Group: `SG-FE`
   - **Auto-assign public IP**: Disable (private subnet, ALB handles traffic)
   - User data:
```bash
#!/bin/bash
yum update -y
yum install -y nginx git nodejs npm

# Clone your frontend code
cd /opt
git clone https://github.com/meriem-mejri/local-task-app.git app
cd app/frontend
npm install
npm run build

# Configure Nginx
cp -r dist/* /usr/share/nginx/html/
systemctl enable nginx
systemctl start nginx
```

#### 3.3 Create Backend Launch Template
1. **EC2** → **Launch Templates** → **Create**
2. Settings:
   - Name: `backend-template`
   - AMI: Amazon Linux 2023
   - Instance type: t2.micro
   - **Key pair**: Select `project-key`
   - **Network settings**:
     - Don't specify subnet (Auto Scaling Group will handle this)
   - Security Group: `SG-BE`
   - **Auto-assign public IP**: Disable (private subnet, ALB handles traffic)
   - User data:
```bash
#!/bin/bash
yum update -y
yum install -y git nodejs npm

# Clone your backend code
cd /opt
git clone https://github.com/meriem-mejri/local-task-app.git app
cd app/backend

# Create .env file (UPDATE RDS_ENDPOINT after RDS creation!)
cat > .env << EOF
DB_HOST=YOUR_RDS_ENDPOINT_HERE
DB_USER=postgres
DB_PASSWORD=YOUR_PASSWORD_HERE
DB_NAME=taskdb
DB_PORT=5432
DB_SSL=true
PORT=3000
NODE_ENV=production
EOF

npm install
npm install -g pm2

# Run migrations (after RDS is available)
node src/migrate.js

# Start backend
pm2 start src/server.js --name api
pm2 startup
pm2 save
```

---

### Step 4: Create Shared Application Load Balancer

#### 4.1 Create Target Groups

**Frontend Target Group**:
1. **EC2** → **Target Groups** → **Create target group**
2. Settings:
   - Target type: Instances
   - Name: `frontend-tg`
   - Protocol: HTTP
   - Port: 80
   - VPC: `project-vpc`
   - Health check path: `/`
   - Health check interval: 30 seconds
3. Don't register targets yet (Auto Scaling will do this)

**Backend Target Group**:
1. **EC2** → **Target Groups** → **Create target group**
2. Settings:
   - Target type: Instances
   - Name: `backend-tg`
   - Protocol: HTTP
   - Port: 3000
   - VPC: `project-vpc`
   - Health check path: `/api/tasks`
   - Health check interval: 30 seconds
3. Don't register targets yet (Auto Scaling will do this)

#### 4.2 Create Shared Application Load Balancer
1. **EC2** → **Load Balancers** → **Create ALB**
2. Settings:
   - Name: `project-alb`
   - Scheme: **Internet-facing**
   - VPC: `project-vpc`
   - Subnets: Select `public-a` and `public-b` (must be in 2 AZs)
   - Security Group: `SG-LB`

3. **Configure Listeners**:
   
   **Listener 1 - HTTP:80 (Frontend)**:
   - Protocol: HTTP
   - Port: 80
   - Default action: Forward to `frontend-tg`
   
   **Listener 2 - HTTP:3000 (Backend)**:
   - After creating the ALB, go to **Load Balancers** → `project-alb` → **Listeners**
   - Click **Add listener**
   - Protocol: HTTP
   - Port: 3000
   - Default action: Forward to `backend-tg`

4. **Create the load balancer**

**Note**: One ALB with two listeners (port 80 for frontend, port 3000 for backend) saves ~$20/month compared to using two separate load balancers!

---

### Step 5: Create Auto Scaling Groups

#### 5.1 Frontend Auto Scaling Group
1. **EC2** → **Auto Scaling Groups** → **Create**
2. Settings:
   - Name: `frontend-asg`
   - Launch template: `frontend-template`
   - VPC: `project-vpc`
   - Subnets: Select `private-fe-a` and `private-fe-b`
   - Load balancing: Attach to existing load balancer
     - Choose target group: `frontend-tg`
   - Health checks: ELB (enable)
   - Desired capacity: 2
   - Minimum capacity: 2
   - Maximum capacity: 4
3. **Scaling Policies**:
   - Policy type: Target tracking scaling
   - Metric: Average CPU Utilization
   - Target value: 70%

#### 5.2 Backend Auto Scaling Group
1. **EC2** → **Auto Scaling Groups** → **Create**
2. Settings:
   - Name: `backend-asg`
   - Launch template: `backend-template`
   - VPC: `project-vpc`
   - Subnets: Select `private-be-a` and `private-be-b`
   - Load balancing: Attach to existing load balancer
     - Choose target group: `backend-tg`
   - Health checks: ELB (enable)
   - Desired capacity: 2
   - Minimum capacity: 2
   - Maximum capacity: 4
3. **Scaling Policies**:
   - Policy type: Target tracking scaling
   - Metric: Average CPU Utilization
   - Target value: 70%

---

### Step 3.6: Testing with PuTTY

**All testing will be done using PuTTY for SSH connections on Windows.**

#### Setup PuTTY
1. **Download PuTTY**: https://www.putty.org
2. **Install both**:
   - PuTTY (SSH client)
   - PuTTYgen (Key converter)

#### Convert Key Pair to .ppk Format
If you have a `.pem` file from AWS:
1. Open **PuTTYgen**
2. Click **Load** → Select your `.pem` file (change filter to "All Files")
3. Click **Save private key** → Save as `project-key.ppk`
4. Close PuTTYgen

---

#### ✅ Test 1: Connect to Bastion Host

**Wait**: 2-3 minutes after launching the bastion instance

**Get Bastion Public IP:**
- Go to **EC2** → **Instances** → `bastion-host`
- Copy the **Public IPv4 address**

**Connect with PuTTY:**
1. Open **PuTTY**
2. **Session** tab:
   - Host Name: `ec2-user@BASTION_PUBLIC_IP`
   - Port: 22
   - Connection type: SSH
3. **Connection** → **SSH** → **Auth** → **Credentials**:
   - Private key file: Browse and select your `project-key.ppk`
4. (Optional) **Session** tab → Save session as "Bastion" for future use
5. Click **Open**
6. Click **Accept** when prompted about the host key

**Expected Result**: You should see Amazon Linux welcome message
```
   ,     #_
   ~\_  ####_        Amazon Linux 2023
  ~~  \_#####\
  ~~     \###|
  ~~       \#/ ___
   ~~       V~' '->
    ~~~         /
```

**If fails**: 
- Check SG-Bastion allows port 22 from YOUR current IP
- Verify you're using the correct `.ppk` file
- Wait 1 more minute (instance might still be initializing)

---

#### ✅ Test 2: Access Frontend EC2 via Bastion (Jump Host)

**After Auto Scaling Group launches frontend instances:**

**Get Frontend Private IP:**
- Go to **EC2** → **Instances** → Find instance from `frontend-asg`
- Copy **Private IPv4 address** (e.g., 10.0.11.x)

**Method 1: Using PuTTY with SSH Tunneling**

1. **Connect to Bastion** (as in Test 1)
2. **From bastion terminal**, connect to frontend:
```bash
ssh ec2-user@FRONTEND_PRIVATE_IP
```
3. **Check frontend status**:
```bash
# Check if user data script completed
sudo cat /var/log/cloud-init-output.log | tail -50

# Check if Nginx is running
sudo systemctl status nginx

# Check frontend files
ls -la /usr/share/nginx/html/

# Exit from frontend instance
exit

# Exit from bastion
exit
```

**Method 2: Using PuTTY Connection → Connection → SSH → Tunnels** (Advanced)
1. Open PuTTY and load your Bastion session
2. **Connection** → **SSH** → **Tunnels**:
   - Source port: 8080
   - Destination: `FRONTEND_PRIVATE_IP:80`
   - Click **Add**
3. Connect to bastion
4. Open browser: `http://localhost:8080` (will show frontend via tunnel)

**Expected Results**:
- `cloud-init-output.log` shows no errors
- Nginx status: `active (running)`
- Frontend files exist in `/usr/share/nginx/html/`

---

#### ✅ Test 3: Access Backend EC2 via Bastion

**Get Backend Private IP:**
- Go to **EC2** → **Instances** → Find instance from `backend-asg`
- Copy **Private IPv4 address**

**Connect via Bastion:**
1. **Connect to Bastion with PuTTY** (Test 1)
2. **From bastion terminal**, connect to backend:
```bash
ssh ec2-user@BACKEND_PRIVATE_IP
```
3. **Check backend status**:
```bash
# Check user data logs
sudo cat /var/log/cloud-init-output.log | tail -50

# Check .env file
cat /opt/app/backend/.env

# Check PM2 processes
pm2 list
pm2 logs api --lines 20

# Test local API
curl http://localhost:3000/api/tasks

# Exit from backend
exit
```

**Expected Results**:
- `.env` file exists with correct RDS endpoint
- PM2 shows `api` process with status `online`
- Logs show: `✓ Server listening on http://localhost:3000`
- Logs show: `✓ Connected to PostgreSQL database`
- API returns JSON: `[]` or list of tasks

**If fails**:
- Check RDS endpoint in `.env` is correct
- Verify SG-DB allows port 5432 from SG-BE
- Check PM2 logs: `pm2 logs api --lines 50`
- Manually restart: `pm2 restart api`

---

#### ✅ Test 4: Test RDS Database Connection

**From Backend EC2 (via Bastion → Backend):**

```bash
# Install PostgreSQL client
sudo yum install -y postgresql15

# Test connection to RDS
psql -h YOUR_RDS_ENDPOINT -U postgres -d taskdb
# Enter password when prompted

# Inside psql, check tables
\dt
SELECT * FROM tasks;
\q

# Exit from backend
exit

# Exit from bastion
exit
```

**Expected Results**:
- Connection succeeds (no timeout or connection refused)
- `tasks` table exists
- Can query data

**If fails**:
- Check SG-DB allows port 5432 from SG-BE
- Verify RDS is in `available` state in AWS Console
- Check RDS endpoint spelling in backend `.env`

---

#### ✅ Test 5: Test Load Balancer

**Wait**: 5-7 minutes after Auto Scaling Groups create instances

**Check Target Health:**
1. Go to **EC2** → **Target Groups**
2. Select `frontend-tg`:
   - **Targets** tab → Status should show **healthy** for 2 instances
3. Select `backend-tg`:
   - **Targets** tab → Status should show **healthy** for 2 instances

**Get ALB DNS Name:**
- Go to **EC2** → **Load Balancers** → `project-alb`
- Copy **DNS name** (e.g., `project-alb-123456.eu-west-1.elb.amazonaws.com`)

**Test Frontend (Port 80):**
1. Open browser
2. Navigate to: `http://ALB_DNS_NAME`
3. You should see your React task application!

**Test Backend API (Port 3000):**
1. Open browser or use command:
```powershell
# In PowerShell on your local Windows machine
curl http://ALB_DNS_NAME:3000/api/tasks
```
2. You should see JSON response: `[]` or list of tasks

**If fails**:
- **Target health "unhealthy"**: 
  - Check security groups (SG-FE allows port 80 from SG-LB, SG-BE allows 3000 from SG-LB)
  - SSH via bastion and check if Nginx/PM2 are running
- **Connection timeout**: 
  - Check SG-LB allows ports 80 and 3000 from 0.0.0.0/0
  - Verify ALB is in public subnets
- **No targets registered**: 
  - Check Auto Scaling Groups are attached to correct target groups

---

#### ✅ Test 6: End-to-End Application Test

**Complete user flow test:**

1. **Open Frontend**: `http://ALB_DNS_NAME`
2. **Create Task**: 
   - Enter title: "Test Task"
   - Click "Ajouter"
   - Task should appear in list
3. **Verify in Database** (via PuTTY → Bastion → Backend):
```bash
# Connect: PuTTY → Bastion → Backend
ssh ec2-user@BACKEND_PRIVATE_IP
psql -h RDS_ENDPOINT -U postgres -d taskdb
SELECT * FROM tasks;
\q
exit
```
4. **Update Task**: 
   - Edit title to "Updated Task"
   - Save
5. **Change Status**: 
   - Use dropdown → Select "Doing"
6. **Delete Task**: 
   - Click 🗑️ icon
   - Confirm deletion

**All operations should work without errors!**

---

### PuTTY Tips & Tricks

**Save Session for Quick Access:**
1. Configure connection (host, port, key file)
2. **Session** tab → Enter name (e.g., "Bastion")
3. Click **Save**
4. Next time: Load saved session → Click Open

**Keep Connection Alive:**
1. **Connection** tab
2. Set "Seconds between keepalives": 30
3. Enable "Enable TCP keepalives"

**Copy/Paste in PuTTY:**
- **Copy**: Select text (automatically copies)
- **Paste**: Right-click in terminal

**Create Desktop Shortcut:**
```
Target: "C:\Program Files\PuTTY\putty.exe" -load "Bastion"
```

**Common PuTTY Keyboard Shortcuts:**
- `Ctrl+C`: Cancel current command
- `Ctrl+D`: Exit/logout
- `Ctrl+L`: Clear screen
- `Tab`: Auto-complete

---

### Quick Troubleshooting via PuTTY

**Check if user data script finished:**
```bash
sudo cat /var/log/cloud-init-output.log | grep -i "cloud-init.*done"
```

**Restart services:**
```bash
# Frontend (Nginx)
sudo systemctl restart nginx
sudo systemctl status nginx

# Backend (PM2)
pm2 restart api
pm2 logs api --lines 50
```

**Test connectivity from frontend to backend:**
```bash
# Connect to frontend via bastion
curl http://BACKEND_PRIVATE_IP:3000/api/tasks
# OR test via ALB listener
curl http://ALB_DNS_NAME:3000/api/tasks
```

**Test backend to RDS connectivity:**
```bash
# From backend instance
pg_isready -h RDS_ENDPOINT -p 5432
```

---

### Step 6: Deploy Amazon RDS

#### 6.1 Create DB Subnet Group
1. **RDS** → **Subnet groups** → **Create**
2. Settings:
   - Name: `db-subnet-group`
   - VPC: `project-vpc`
   - Add subnets: `private-db-a`, `private-db-b`

#### 6.2 Create RDS Instance (Multi-AZ)
1. **RDS** → **Create database**
2. Settings:
   - Engine: PostgreSQL 15
   - Template: **Production** (enables Multi-AZ by default)
   - DB instance identifier: `project-db`
   - Master username: `postgres`
   - Master password: (create and save securely - you'll need this!)
   - Instance class: **db.t3.micro** (or db.t4g.micro)
   - Storage: 20 GB (General Purpose SSD)
   - **Multi-AZ**: ✅ **Enable** (REQUIRED for high availability)
     - Primary instance in `private-db-a`
     - Standby instance in `private-db-b`
     - Automatic failover enabled
   - VPC: `project-vpc`
   - DB subnet group: `db-subnet-group`
   - Public access: **No**
   - Security group: Select `SG-DB` (remove default if present)
   - Initial database name: `taskdb` (IMPORTANT - don't skip this!)
   - Backup retention: 7 days (automatic daily backups)
   - Enable automated backups: ✅
   - Multi-AZ failover: Automatic

3. Click **Create database**
4. **Wait 15-20 minutes** for Multi-AZ RDS to become available (longer than Single-AZ)
5. **After creation**, note the **endpoint** (e.g., `project-db.xxx.eu-west-1.rds.amazonaws.com`)

**Multi-AZ Benefits:**
- ✅ Automatic failover to standby if primary fails
- ✅ Synchronous replication between AZs
- ✅ Reduced latency for read replicas
- ✅ Enhanced availability (99.95% SLA)

**Update Backend Launch Template:**
After RDS is created, update the backend launch template:
1. Go to **EC2** → **Launch Templates** → `backend-template`
2. **Actions** → **Modify template (Create new version)**
3. Update the user data script:
   - Replace `YOUR_RDS_ENDPOINT_HERE` with your actual RDS endpoint
   - Replace `YOUR_PASSWORD_HERE` with your RDS master password
4. Click **Create template version**
5. **Actions** → **Set default version** → Select new version

**Important**: If Auto Scaling Group is already running, you'll need to refresh instances:
- **EC2** → **Auto Scaling Groups** → `backend-asg`
- **Instance refresh** → **Start instance refresh** (gradually replaces instances)

---

### Step 7: Deploy S3, CloudFront, Security & Monitoring

#### 7.1 Create S3 Bucket for Static Assets
1. **S3** → **Create bucket**
2. Settings:
   - Name: `project-static-assets-UNIQUEID` (must be globally unique, use your student ID)
   - Region: **Same as your VPC** (eu-west-1)
   - Block all public access: ✅ **Enable** (CloudFront will handle access)
   - Versioning: Enable (for asset rollback)
3. Click **Create bucket**

**Upload Static Assets:**
1. Go to your S3 bucket
2. Create folder structure:
   ```
   /images
   /stylesheets
   /fonts
   /js
   ```
3. Upload frontend static assets (from your build output):
   - Images, CSS libraries, JavaScript libraries
   - Do NOT upload HTML (served by CloudFront with cache headers)

#### 7.2 Create CloudFront Distribution
1. **CloudFront** → **Distributions** → **Create distribution**
2. Settings:
   - **Origin domain**: Select your S3 bucket from dropdown
   - **Origin access control**: 
     - Create new control: `project-s3-oac`
     - Select **Sign requests (recommended)**
   - **Default cache behavior**:
     - Compress objects automatically: ✅
     - Cache policy: **CachingOptimized**
     - Origin request policy: **CORS-S3Origin**
   - **Viewer protocol policy**: **Redirect HTTP to HTTPS**
   - **Allowed HTTP methods**: GET, HEAD, OPTIONS
   - **Alternate domain names (CNAMEs)**: (optional if you have a domain)
   - **Default root object**: `index.html`
   - **Enable logging**: ✅ (optional, logs to CloudFront logs bucket)
   - **Price class**: **Use only North America and Europe** (cost optimization)

3. Click **Create distribution**
4. **Wait 5-10 minutes** for CloudFront to deploy
5. Note the **CloudFront domain name** (e.g., `d123456.cloudfront.net`)

**Update S3 Bucket Policy:**
After CloudFront distribution is created:
1. Go to **S3** → Your bucket → **Permissions** → **Bucket Policy**
2. CloudFront will show you a policy to add. Click **Copy policy from distribution** or add:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "arn:aws:cloudfront::YOUR-ACCOUNT-ID:distribution/YOUR-DISTRIBUTION-ID"
                }
            }
        }
    ]
}
```

#### 7.3 Configure AWS Certificate Manager (ACM) - HTTPS/TLS

**Option A: Using Route53 Domain (if you have a domain):**
1. **Certificate Manager** → **Request a certificate**
2. Domain name: `yourdomain.com` and `www.yourdomain.com`
3. Validation method: **DNS validation** (recommended)
4. Create certificate
5. Wait for DNS validation (CloudFront will auto-validate if domain is in Route53)

**Option B: Using ALB DNS (no custom domain needed):**
1. Skip ACM certificate
2. ALB will use default HTTPS listener with self-signed cert
3. This works for testing but shows browser warnings

**Attach Certificate to ALB:**
1. **EC2** → **Load Balancers** → `project-alb`
2. **Listeners and rules** tab
3. **Add listener**:
   - Protocol: **HTTPS**
   - Port: **443**
   - Default action: Forward to `frontend-tg`
   - Security policy: **ELBSecurityPolicy-TLS-1-2-2017-01**
   - Certificate: Select your ACM certificate (if using one)
4. Click **Add**

**Update Security Group:**
1. Go to **Security Groups** → `SG-LB`
2. **Inbound rules** → Confirm port 443 (HTTPS) is allowed from 0.0.0.0/0

**Enable HTTP to HTTPS Redirect:**
1. Go to ALB → Listeners
2. Select HTTP:80 listener
3. **Manage rules** → Edit default action
4. Change to: **Redirect to HTTPS:443** with status code **301**

---

#### 7.4 Configure CloudWatch Alarms
1. **CloudWatch** → **Alarms** → **Create alarm**

**CPU Alarm (Frontend ASG)**:
- Metric: EC2 → By Auto Scaling Group → `frontend-asg` → CPUUtilization
- Threshold: > 70%
- Period: 5 minutes
- Actions: Send to SNS topic

**CPU Alarm (Backend ASG)**:
- Same for `backend-asg`

**RDS CPU Alarm**:
- Metric: RDS → By Database → `project-db` → CPUUtilization
- Threshold: > 70%

**ALB Target Health Alarm**:
- Metric: ApplicationELB → Per AppELB Metrics → `project-alb` → UnHealthyHostCount
- Threshold: > 0
- Period: 1 minute

#### 7.5 Create SNS Topic
1. **SNS** → **Topics** → **Create topic**
2. Name: `project-alerts`
3. Type: Standard
4. Create subscription:
   - Protocol: Email
   - Endpoint: your-email@example.com
5. **Confirm subscription via email** (check your inbox!)

#### 7.6 Enable CloudTrail
1. **CloudTrail** → **Create trail**
2. Settings:
   - Name: `project-trail`
   - Storage: Create new S3 bucket (AWS will create it)
   - Log events: Management events (read/write)
3. Click **Create trail**

#### 7.7 RDS Automated Backups & Multi-AZ Failover
- Already enabled during RDS creation (Multi-AZ setup)
- Verify: **RDS** → `project-db` → **Maintenance & backups** tab
- Backup retention: 7 days
- Backup window: Configured automatically
- **Multi-AZ Details**:
  - Primary in `private-db-a`
  - Standby in `private-db-b`
  - Automatic failover on primary failure (~1-2 minutes)
  - Read replicas can be created for scaling reads

---

## Phase 2: Container Migration (Step 8 - ECS) - OPTIONAL

**This step is optional and can be done if you have extra time and budget.**

### 8.1 Containerize Application

#### Create Dockerfile (Backend)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "src/server.js"]
```

#### Create Dockerfile (Frontend)
```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 8.2 Push Images to ECR

```bash
# Create ECR repositories
aws ecr create-repository --repository-name project-backend
aws ecr create-repository --repository-name project-frontend

# Build and push backend
docker build -t project-backend backend/
docker tag project-backend:latest AWS_ACCOUNT.dkr.ecr.REGION.amazonaws.com/project-backend:latest
docker push AWS_ACCOUNT.dkr.ecr.REGION.amazonaws.com/project-backend:latest

# Build and push frontend
docker build -t project-frontend frontend/
docker tag project-frontend:latest AWS_ACCOUNT.dkr.ecr.REGION.amazonaws.com/project-frontend:latest
docker push AWS_ACCOUNT.dkr.ecr.REGION.amazonaws.com/project-frontend:latest
```

### 8.3 Create ECS Cluster
1. **ECS** → **Clusters** → **Create cluster**
2. Settings:
   - Name: `project-cluster`
   - Infrastructure: AWS Fargate
   - VPC: `project-vpc`

### 8.4 Create Task Definitions

**Backend Task Definition**:
```json
{
  "family": "backend-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "AWS_ACCOUNT.dkr.ecr.REGION.amazonaws.com/project-backend:latest",
      "portMappings": [{"containerPort": 3000, "protocol": "tcp"}],
      "environment": [
        {"name": "DB_HOST", "value": "RDS_ENDPOINT"},
        {"name": "DB_USER", "value": "postgres"},
        {"name": "DB_NAME", "value": "taskdb"},
        {"name": "DB_PORT", "value": "5432"},
        {"name": "DB_SSL", "value": "true"},
        {"name": "PORT", "value": "3000"}
      ],
      "secrets": [
        {"name": "DB_PASSWORD", "valueFrom": "arn:aws:secretsmanager:..."}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/backend",
          "awslogs-region": "eu-west-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### 8.5 Create ECS Services
1. **ECS** → **Clusters** → `project-cluster` → **Create service**
2. **Backend Service**:
   - Launch type: Fargate
   - Task definition: `backend-task`
   - Desired tasks: 2
   - VPC: `project-vpc`
   - Subnets: `private-be-a`, `private-be-b`
   - Security group: `SG-BE`
   - Load balancer: `backend-alb`, target group `backend-tg`
3. **Frontend Service**: Same process with frontend task definition

### 8.6 Configure Auto Scaling (ECS)
1. **Service** → **Auto Scaling**
2. Policy:
   - Type: Target tracking
   - Metric: ECSServiceAverageCPUUtilization
   - Target value: 70%
   - Min tasks: 2
   - Max tasks: 4

---

## Step 9: Documentation and Finalization

### Architecture Diagram
Create diagrams showing:
- Network topology (VPC, subnets, routing)
- Application flow (ALB → EC2 → RDS)
- Security (Security Groups, IAM roles)
- Monitoring (CloudWatch, SNS, CloudTrail)

**Tools for diagrams**:
- draw.io (free, online)
- Lucidchart
- AWS Architecture Icons (official)

### Configuration Details
Document:
- VPC CIDR: 10.0.0.0/16
- All subnet CIDRs and their purposes
- Security group rules (all 5 SGs)
- RDS endpoint and credentials (store securely!)
- ALB DNS name
- Auto Scaling Group settings

### Deployment Checklist
- [ ] VPC with 8 subnets created (2 public, 2 frontend private, 2 backend private, 2 database private)
- [ ] 5 Security Groups configured correctly (SG-LB, SG-FE, SG-BE, SG-DB, SG-Bastion)
- [ ] Bastion host accessible via PuTTY with .ppk key
- [ ] RDS PostgreSQL Multi-AZ running (primary + standby in separate AZs)
- [ ] Frontend Launch Template created with correct security group
- [ ] Backend Launch Template created with correct RDS endpoint
- [ ] Shared ALB created with SG-LB security group
- [ ] Frontend Target Group (port 80) healthy and registered
- [ ] Backend Target Group (port 3000) healthy and registered
- [ ] Frontend Auto Scaling Group (2-4 instances) running
- [ ] Backend Auto Scaling Group (2-4 instances) running
- [ ] S3 bucket created with static assets uploaded
- [ ] CloudFront distribution deployed and active
- [ ] ACM certificate created and attached to ALB (HTTPS:443)
- [ ] HTTP:80 redirects to HTTPS:443
- [ ] CloudWatch alarms configured for CPU, RDS health
- [ ] SNS topic created and email subscribed
- [ ] CloudTrail enabled for audit logging
- [ ] Application accessible via HTTPS ALB DNS
- [ ] All CRUD operations working end-to-end
- [ ] RDS Multi-AZ failover capability verified

### Cost Optimization Summary
**Monthly Cost Estimate** (~$150-180 for 2 students, ~$75-90/student):
- **RDS Multi-AZ**: ~$35/month (required per project specification)
- **EC2 instances** (4x t2.micro with Auto Scaling): ~$30/month
- **Application Load Balancer**: ~$25/month
- **NAT Gateways** (2x): ~$45/month
- **S3 storage** (static assets): ~$5/month (required per project specification)
- **CloudFront**: ~$10/month (required per project specification)
- **CloudWatch/CloudTrail**: ~$5/month (required per project specification)
- **Data transfer**: ~$5/month
- **Total**: ~$160/month

**Cost Optimization Strategies Applied:**
- ✅ Single shared ALB with 2 listeners (saves $20/month vs 2 separate ALBs)
- ✅ t2.micro instances (Free Tier eligible for first year)
- ✅ Auto Scaling (scales down during low traffic)
- ✅ CloudFront cost class: "Use only North America and Europe" (not all regions)
- ✅ S3 lifecycle policies can be added for old backups
- ❌ Multi-AZ RDS required (cannot skip per project specification)

---

## Testing Checklist

### Infrastructure Tests
- [ ] Can connect to Bastion with PuTTY using .ppk key
- [ ] Can SSH from Bastion to Frontend instances
- [ ] Can SSH from Bastion to Backend instances
- [ ] Frontend target group shows 2 healthy instances
- [ ] Backend target group shows 2 healthy instances
- [ ] ALB DNS resolves and responds on both port 80 and 443
- [ ] HTTPS works with valid certificate
- [ ] HTTP automatically redirects to HTTPS

### Application Tests
- [ ] Frontend loads via `https://ALB_DNS_NAME` (HTTPS)
- [ ] Backend API responds via `https://ALB_DNS_NAME:3000/api/tasks`
- [ ] Can create new task from UI
- [ ] Can update existing task
- [ ] Can change task status (Todo → Doing → Done)
- [ ] Can delete task
- [ ] Tasks persist in RDS database

### S3 and CloudFront Tests
- [ ] S3 bucket created with correct name
- [ ] Static assets uploaded to S3
- [ ] CloudFront distribution deployed
- [ ] CloudFront domain accessible via browser
- [ ] Static assets load faster via CloudFront (check CloudFront metrics)
- [ ] S3 bucket policy correctly restricts access to CloudFront only
- [ ] S3 files NOT publicly accessible (private access only)

### Database Tests (via PuTTY → Bastion → Backend)
- [ ] Can connect to RDS from backend instance (Multi-AZ primary)
- [ ] `tasks` table exists
- [ ] Data matches what's shown in UI
- [ ] RDS automated backups enabled
- [ ] RDS has standby instance in different AZ
- [ ] Can identify primary and standby instances

### Security Tests
- [ ] All inbound traffic to ALB uses HTTPS (port 443)
- [ ] HTTP traffic redirects to HTTPS
- [ ] ACM certificate is valid and trusted
- [ ] No security group allows unnecessary ports
- [ ] Bastion SSH accessible only from your IP
- [ ] Backend and Frontend instances not directly accessible from internet

### High Availability Tests
- [ ] Stop one frontend instance → ALB still serves traffic
- [ ] Stop one backend instance → API still works
- [ ] Auto Scaling launches replacement instances within 5 minutes
- [ ] Stop RDS primary → Automatic failover to standby (1-2 minutes)
- [ ] Verify RDS is still accessible after failover

### Monitoring Tests
- [ ] CloudWatch shows metrics for EC2, ALB, RDS
- [ ] SNS email notifications received (subscribe and verify)
- [ ] CloudTrail logs show recent API calls
- [ ] Alarms trigger when threshold exceeded (test by stopping instance)
- [ ] CloudWatch Logs show application logs from EC2 instances

---

## Troubleshooting Guide

### Common Issues and Solutions

**1. Cannot connect to Bastion with PuTTY**
- ✓ Check SG-Bastion allows port 22 from your IP
- ✓ Verify you're using the correct .ppk file
- ✓ Confirm bastion has public IP
- ✓ Update your IP if changed (https://whatismyip.com)

**2. Target group shows "unhealthy" instances**
- ✓ Check security groups allow traffic from ALB
- ✓ Verify application is running (SSH and check nginx/pm2)
- ✓ Check health check path is correct
- ✓ Review cloud-init logs: `sudo cat /var/log/cloud-init-output.log`

**3. Backend cannot connect to RDS**
- ✓ Verify SG-DB allows port 5432 from SG-BE
- ✓ Check RDS endpoint in backend .env file
- ✓ Confirm RDS is in "available" state
- ✓ Test connection: `pg_isready -h RDS_ENDPOINT -p 5432`

**4. Auto Scaling Group not launching instances**
- ✓ Check IAM role for Auto Scaling (should be created automatically)
- ✓ Verify launch template has no errors
- ✓ Check if you've reached EC2 instance limits
- ✓ Review Auto Scaling activity history for errors

**5. Application loads but API calls fail**
- ✓ Check backend logs: `pm2 logs api`
- ✓ Verify frontend can reach backend ALB listener on port 3000
- ✓ Test API directly: `curl http://ALB_DNS:3000/api/tasks`
- ✓ Check CORS settings if cross-origin issues

**6. User data script fails**
- ✓ SSH to instance and check logs: `/var/log/cloud-init-output.log`
- ✓ Verify GitHub repo URL is correct and accessible
- ✓ Check if npm install completed successfully
- ✓ Manually run failed commands to debug

**7. High costs / Budget exceeded**
- ✓ Verify only necessary resources are running
- ✓ Check NAT Gateway data transfer (biggest cost!)
- ✓ Stop/terminate unused instances
- ✓ Use AWS Cost Explorer to identify cost sources
- ✓ Set up billing alarms

### Debug Commands (via PuTTY)

**Check service status:**
```bash
# Frontend
sudo systemctl status nginx
sudo journalctl -u nginx --no-pager --lines=50

# Backend
pm2 status
pm2 logs api --lines=100
```

**Network connectivity:**
```bash
# Test DNS resolution
nslookup RDS_ENDPOINT

# Test port connectivity
nc -zv RDS_ENDPOINT 5432
nc -zv ALB_DNS 80

# Check routes
ip route
```

**Application logs:**
```bash
# Frontend
sudo tail -100 /var/log/nginx/error.log

# Backend
pm2 logs api --lines=100 --raw
cat /opt/app/backend/.env
```

---

## Project Complete! ✅

**You now have a production-ready, highly available, auto-scaling 3-tier application on AWS fully compliant with all project requirements!**

### ✅ Key Achievements:
✅ **Network**: VPC with 8 subnets across 2 Availability Zones  
✅ **Security**: 5 Security Groups with least-privilege access (SG-LB, SG-FE, SG-BE, SG-DB, SG-Bastion)  
✅ **Load Balancing**: Shared ALB with 2 listeners (cost-optimized)  
✅ **Compute**: Auto Scaling Groups with 2-4 instances each, Multi-AZ  
✅ **Database**: RDS PostgreSQL **Multi-AZ** with automatic failover  
✅ **Static Content**: S3 bucket + CloudFront CDN for global distribution  
✅ **Encryption**: ACM SSL/TLS certificates for HTTPS/secure connections  
✅ **Access**: Bastion host with PuTTY SSH access  
✅ **Monitoring**: CloudWatch metrics + CloudTrail audit logs  
✅ **Alerting**: SNS notifications for critical events  
✅ **Compliance**: CloudTrail logging all API actions  
✅ **High Availability**: Multi-AZ everything for 99.95% SLA  

### Compliance with Project Requirements:
✅ **Étape 1**: VPC + 8 subnets + IGW + 2 NAT Gateways + Route tables  
✅ **Étape 2**: 5 Security Groups (SG-LB, SG-FE, SG-BE, SG-DB, SG-Bastion)  
✅ **Étape 3**: 2 Frontend EC2 + 2 Backend EC2 + Bastion + ALB + Auto Scaling  
✅ **Étape 4**: RDS Multi-AZ with automatic failover  
✅ **Étape 5**: S3 bucket + CloudFront distribution  
✅ **Étape 6**: CloudWatch + Alarms + SNS + CloudTrail + ACM HTTPS  
✅ **Étape 7**: ECS containerization (optional, documented)  
✅ **Étape 8**: Complete documentation with architecture diagrams  

### Cost Summary:
- **Monthly**: ~$160/month (~$80/student for 2 students)
- **Includes**: Multi-AZ RDS (required), S3+CloudFront (required), HTTPS/ACM (required)
- **Optimization**: Single shared ALB saves $20/month, t2.micro Free Tier saves $30/month

### Next Steps:
1. **Monitor Application**: Check CloudWatch dashboards for metrics
2. **Test Failover**: Stop RDS primary to verify automatic failover
3. **Document Everything**: Take screenshots of all resources
4. **Performance Test**: Use Apache Bench or LoadRunner to test Auto Scaling
5. **Security Audit**: Verify all resources follow the principle of least privilege
6. **Cost Monitoring**: Set up billing alerts in AWS Budgets
7. **Backup Verification**: Test RDS snapshot restoration
8. **Prepare Presentation**: Explain architecture, decisions, and compliance

### AWS Best Practices Applied:
✅ **High Availability**: Multi-AZ across regions, no single points of failure  
✅ **Security**: Security groups, encryption (HTTPS), CloudTrail audit logs  
✅ **Scalability**: Auto Scaling Groups with target tracking  
✅ **Performance**: CloudFront CDN for static assets, ALB for request distribution  
✅ **Cost Optimization**: Single shared ALB, t2.micro instances, CloudFront cost classes  
✅ **Monitoring**: CloudWatch metrics, alarms, SNS notifications  
✅ **Disaster Recovery**: RDS backups, Multi-AZ failover, Auto Scaling recovery  
✅ **Compliance**: CloudTrail logging, resource tagging, documented architecture  

---

**Congratulations! Your AWS deployment is production-ready! 🚀**
