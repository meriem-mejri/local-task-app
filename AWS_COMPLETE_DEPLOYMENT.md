# AWS Deployment - Complete 3-Tier Architecture (IGL4/GLSI3)

**This guide implements the full project requirements for the AWS evaluation.**

---

## 💡 Two-Phase Deployment Strategy

### Phase A: Sandbox Testing (NOW - Free)
Test core infrastructure without expensive services. Focus on validating architecture before spending AWS budget.

**What to deploy in Sandbox:**
- ✅ Step 1: VPC with 8 subnets
- ✅ Step 2: Security Groups (6 SGs)
- ✅ Step 3.1: Bastion host (1x t2.micro in public subnet)
- ✅ Step 3.2-3.3: Frontend + Backend EC2 (1 each in private subnets - NO ALBs)
- ✅ Step 4: RDS PostgreSQL (Single-AZ t3.micro)
- ✅ Step 6: CloudWatch monitoring + CloudTrail
- ❌ Step 3.4-3.5: SKIP ALBs and Auto Scaling (test on AWS later)
- ❌ Step 5: SKIP S3/CloudFront (optional)
- ❌ Step 7: SKIP ECS (optional)

**Sandbox Deployment Modifications:**
1. **SG-BE Inbound**: Change from "3000 from SG-ALB-External" to "3000 from 0.0.0.0/0" (direct internet)
2. **EC2 Security Groups**: Simplify to 4 SGs (SG-FE, SG-BE, SG-DB, SG-Bastion)
3. **No ALB**: Connect to EC2 public IPs directly for testing
4. **Single-AZ RDS**: Save money (upgrade to Multi-AZ on AWS later)

**Success Criteria for Phase A:**
- [ ] VPC with 8 subnets across 2 AZs
- [ ] 4 security groups created and applied
- [ ] Bastion accessible via SSH
- [ ] Frontend EC2 accessible via public IP:80
- [ ] Backend EC2 accessible via public IP:3000
- [ ] Backend connects to RDS (test: GET /api/tasks)
- [ ] CRUD operations work (Create, Read, Update, Delete)
- [ ] CloudWatch monitoring shows traffic
- [ ] CloudTrail logs API calls

---

### Phase B: AWS Production Deployment ($50/student x 2)
After sandbox validation, deploy to real AWS account with full architecture including ALBs and Auto Scaling.

**What to add on AWS:**
- ✅ Steps 1-4: Same as sandbox (VPC, SGs, EC2, RDS)
- ✅ Step 3.4-3.5: Add ALBs + Auto Scaling (2-4 instances each)
- ✅ Step 5: Add S3 bucket + CloudFront (optional)
- ✅ Step 6: Configure ACM SSL certificates
- ✅ Step 7: Containerize + ECS Fargate (optional)

**AWS Cost Optimization ($100 shared, $50/student):**
- Use **RDS Single-AZ** instead of Multi-AZ: Save $25/month
- Use **1 ALB** with multiple listeners instead of 2 separate: Save $20/month
- Skip **S3/CloudFront** initially: Save $5/month
- **Target**: ~$100-120/month (fits $50/student budget)

**Deployment Timeline for Phase B:**
1. **Day 1**: Redeploy core (VPC, SGs, RDS, EC2) - ~2 hours
2. **Day 2**: Add ALBs + Auto Scaling - ~2 hours
3. **Day 3**: Configure monitoring + certificates - ~1 hour
4. **Optional**: ECS/Fargate migration - ~2 hours (if budget allows)

---

### Step Dependencies (For Both Phases)
- **Step 1 (VPC)** → Do first (required for everything)
- **Step 2 (Security Groups)** → Do second
- **Step 3 (EC2)** → Steps 3.1, 3.2, 3.3 can be in any order (skip 3.4-3.5 in Phase A)
- **Step 4 (RDS)** → Can do after Step 2
- **Step 5 (S3/CloudFront)** → Optional, Phase B only
- **Step 6 (Monitoring)** → Optional, do last
- **Step 7 (ECS)** → Optional Phase B, requires containerization

---

### Local Testing First (Recommended)
**Before deploying anywhere, test locally:**
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
   ├─── CloudFront (CDN for static assets)
   │
   └─── Application Load Balancer (Public Subnets)
         │
         ├─── Frontend EC2 Instances (Private Subnets A & B)
         │    └─── Auto Scaling Group
         │
         └─── Backend EC2 Instances (Private Subnets A & B)
              └─── Auto Scaling Group
              └─── RDS PostgreSQL (Multi-AZ, Private Subnets)
```

### Network Architecture
- **VPC**: 10.0.0.0/16
- **8 Subnets** across 2 Availability Zones:
  - 2 Public (ALB, NAT, Bastion)
  - 6 Private (2 for Frontend, 2 for Backend, 2 for RDS)
- **Security**: 6 Security Groups (SG-ALB-External, SG-ALB-Internal, SG-FE, SG-BE, SG-DB, SG-Bastion)
- **High Availability**: Multi-AZ deployment, Auto Scaling
- **Monitoring**: CloudWatch, CloudTrail, SNS alerts

---

## Phase 1: Infrastructure Setup (Steps 1-6)

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

**⚠️ IMPORTANT: Choose configuration based on deployment phase:**
- **Phase A (Sandbox)**: Use simplified 4 SGs (no ALB security groups needed)
- **Phase B (Production)**: Use full 6 SGs (includes SG-ALB-External and SG-ALB-Internal)

---

## Phase A: Sandbox Security Groups (4 SGs)

### SG-FE (Frontend Instances)

**Inbound Rules:**
| Type       | Protocol | Port Range | Source Type | Source      | Description                                 |
|------------|----------|-----------|-------------|-------------|---------------------------------------------|
| HTTP       | TCP      | 80        | IPv4        | 0.0.0.0/0   | Allow HTTP from internet (direct access)    |
| SSH        | TCP      | 22        | Security Group  | SG-Bastion  | Allow SSH from bastion host                 |

**Outbound Rules:**
| Type        | Protocol | Port Range | Destination Type | Destination | Description                           |
|-------------|----------|-----------|------------------|-------------|---------------------------------------|
| All traffic | All      | All       | IPv4             | 0.0.0.0/0   | Allow all outbound traffic            |

---

### SG-BE (Backend Instances)

**Inbound Rules:**
| Type       | Protocol | Port Range | Source Type | Source      | Description                                 |
|------------|----------|-----------|-------------|-------------|---------------------------------------------|
| Custom TCP | TCP      | 3000      | IPv4        | 0.0.0.0/0   | Allow API access from internet (testing)    |
| SSH        | TCP      | 22        | Security Group  | SG-Bastion  | Allow SSH from bastion host                 |

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

## Phase B: Production Security Groups (6 SGs)

**For Phase B, create these 2 additional security groups:**

### SG-ALB-External (External Load Balancer)

**Inbound Rules:**
| Type  | Protocol | Port Range | Source Type | Source      | Description                           |
|-------|----------|-----------|-------------|-------------|---------------------------------------|
| HTTP  | TCP      | 80        | IPv4        | 0.0.0.0/0   | Allow HTTP from internet              |
| HTTPS | TCP      | 443       | IPv4        | 0.0.0.0/0   | Allow HTTPS from internet             |

**Outbound Rules:**
| Type        | Protocol | Port Range | Destination Type | Destination | Description                           |
|-------------|----------|-----------|------------------|-------------|---------------------------------------|
| All traffic | All      | All       | IPv4             | 0.0.0.0/0   | Allow all outbound traffic            |

---

#### SG-ALB-Internal (Internal Load Balancer)

**Inbound Rules:**
| Type       | Protocol | Port Range | Source Type     | Source | Description                                      |
|------------|----------|-----------|-----------------|--------|--------------------------------------------------|
| HTTP       | TCP      | 80        | Security Group  | SG-FE  | Allow frontend instances to proxy API requests   |
| Custom TCP | TCP      | 3000      | Security Group  | SG-FE  | Allow frontend to access backend API             |

**Outbound Rules:**
| Type        | Protocol | Port Range | Destination Type | Destination | Description                           |
|-------------|----------|-----------|------------------|-------------|---------------------------------------|
| All traffic | All      | All       | IPv4             | 0.0.0.0/0   | Allow all outbound traffic            |

---

### SG-FE (Frontend Instances) - UPDATED for Phase B

**Inbound Rules:**
| Type       | Protocol | Port Range | Source Type     | Source           | Description                                 |
|------------|----------|-----------|-----------------|------------------|---------------------------------------------|
| HTTP       | TCP      | 80        | Security Group  | SG-ALB-External  | Allow traffic from external load balancer   |
| SSH        | TCP      | 22        | Security Group  | SG-Bastion       | Allow SSH from bastion host                 |

**Outbound Rules:**
| Type        | Protocol | Port Range | Destination Type | Destination | Description                           |
|-------------|----------|-----------|------------------|-------------|---------------------------------------|
| All traffic | All      | All       | IPv4             | 0.0.0.0/0   | Allow all outbound traffic            |

---

### SG-BE (Backend Instances) - UPDATED for Phase B

**Inbound Rules:**
| Type       | Protocol | Port Range | Source Type     | Source           | Description                                 |
|------------|----------|-----------|-----------------|------------------|---------------------------------------------|
| Custom TCP | TCP      | 3000      | Security Group  | SG-ALB-Internal  | Allow traffic from internal load balancer   |
| SSH        | TCP      | 22        | Security Group  | SG-Bastion       | Allow SSH from bastion host                 |

**Outbound Rules:**
| Type        | Protocol | Port Range | Destination Type | Destination | Description                           |
|-------------|----------|-----------|------------------|-------------|---------------------------------------|
| All traffic | All      | All       | IPv4             | 0.0.0.0/0   | Allow all outbound traffic            |

**Note**: SG-DB and SG-Bastion remain the same in both Phase A and Phase B (see Phase A section above).

---

**Migration from Phase A to Phase B:**
When moving from sandbox to production:
1. Create SG-ALB-External and SG-ALB-Internal
2. **Edit SG-FE**: Change HTTP source from `0.0.0.0/0` to `SG-ALB-External`
3. **Edit SG-BE**: Change port 3000 source from `0.0.0.0/0` to `SG-ALB-Internal`
4. Keep SG-DB and SG-Bastion unchanged

---

### Step 3: Deploy EC2 Instances

#### 3.1 Launch Bastion Host
1. **EC2** → **Launch Instance**
2. Settings:
   - Name: `bastion-host`
   - AMI: Amazon Linux 2023
   - Instance type: t2.micro
   - **Key pair**: Create new key pair (e.g., `project-key`) or select existing
     - **IMPORTANT**: Download `.pem` file and save securely (you'll use this for all EC2 instances)
   - Network: `project-vpc`
   - Subnet: `public-a`
   - Security Group: `SG-Bastion`
   - Auto-assign public IP: **Enable** ✅

#### 3.2 Create Frontend Launch Template
1. **EC2** → **Launch Templates** → **Create**
2. Settings:
   - Name: `frontend-template`
   - AMI: Amazon Linux 2023
   - Instance type: t2.micro
   - **Key pair**: Select `project-key` (same as bastion)
   - **Network settings**:
     - **Phase A (Sandbox)**: Leave subnet blank (will specify during manual launch)
     - **Phase B (Production)**: Leave blank (Auto Scaling Group will use `private-fe-a` and `private-fe-b`)
   - Security Group: `SG-FE`
   - **Auto-assign public IP**:
     - **Phase A**: Enable (for direct access)
     - **Phase B**: Disable (private subnet, ALB handles traffic)
   - User data:
```bash
#!/bin/bash
yum update -y
yum install -y nginx git nodejs npm

# Clone your frontend code
cd /opt
git clone YOUR_REPO_URL app
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
   - **Key pair**: Select `project-key` (same as bastion)
   - **Network settings**:
     - **Phase A (Sandbox)**: Leave subnet blank (will specify during manual launch)
     - **Phase B (Production)**: Leave blank (Auto Scaling Group will use `private-be-a` and `private-be-b`)
   - Security Group: `SG-BE`
   - **Auto-assign public IP**:
     - **Phase A**: Enable (for direct access)
     - **Phase B**: Disable (private subnet, internal ALB handles traffic)
   - User data:
```bash
#!/bin/bash
yum update -y
yum install -y git nodejs npm

# Clone your backend code
cd /opt
git clone YOUR_REPO_URL app
cd app/backend

# Create .env file
cat > .env << EOF
DB_HOST=YOUR_RDS_ENDPOINT
DB_USER=postgres
DB_PASSWORD=YOUR_DB_PASSWORD
DB_NAME=taskdb
DB_PORT=5432
DB_SSL=true
PORT=3000
NODE_ENV=production
EOF

npm install
npm install -g pm2

# Run migrations
node src/migrate.js

# Start backend
pm2 start src/server.js --name api
pm2 startup
pm2 save
```

#### 3.4 Create Application Load Balancers

**Frontend ALB** (External):
1. **EC2** → **Load Balancers** → **Create ALB**
2. Settings:
   - Name: `frontend-alb`
   - Scheme: Internet-facing
   - VPC: `project-vpc`
   - Subnets: `public-a`, `public-b`
   - Security Group: `SG-ALB-External`
3. Create Target Group:
   - Name: `frontend-tg`
   - Protocol: HTTP
   - Port: 80
   - Health check path: `/`
4. Don't register targets yet (Auto Scaling will do this)

**Backend ALB** (Internal):
1. Create ALB: `backend-alb`
2. Settings:
   - Name: `backend-alb`
   - Scheme: **Internal** (not internet-facing)
   - VPC: `project-vpc`
   - Subnets: `private-fe-a`, `private-fe-b`
   - Security Group: `SG-ALB-Internal`
3. Create Target Group:
   - Name: `backend-tg`
   - Protocol: HTTP
   - Port: 3000
   - Health check path: `/api/tasks`

#### 3.5 Create Auto Scaling Groups

**Frontend ASG**:
1. **EC2** → **Auto Scaling Groups** → **Create**
2. Settings:
   - Name: `frontend-asg`
   - Launch template: `frontend-template`
   - VPC: `project-vpc`
   - Subnets: `private-fe-a`, `private-fe-b`
   - Load balancer: Attach to `frontend-tg`
   - Desired: 2, Min: 2, Max: 4
3. **Scaling Policies**:
   - Target tracking: CPU Utilization > 70%

**Backend ASG**:
1. Create ASG: `backend-asg`
2. Settings:
   - Launch template: `backend-template`
   - Subnets: `private-be-a`, `private-be-b`
   - Load balancer: Attach to `backend-tg`
   - Desired: 2, Min: 2, Max: 4
3. **Scaling Policies**:
   - Target tracking: CPU Utilization > 70%

---

### Step 3.6: Incremental Testing (DO NOT SKIP!)

**Test after EACH step to catch issues early. Don't wait until everything is configured!**

#### ✅ Test 1: After Bastion Host Launch (Step 3.1)
**Wait**: 2-3 minutes for instance to start

**Test SSH Access:**
```powershell
# Get bastion public IP from AWS Console
# EC2 → Instances → bastion-host → Public IPv4 address

# Test SSH connection (replace YOUR_KEY.pem and BASTION_IP)
ssh -i path/to/YOUR_KEY.pem ec2-user@BASTION_IP
```

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
- Verify key pair was selected during launch
- Wait 1 more minute (instance might still be initializing)

---

#### ✅ Test 2: After Frontend EC2 Launch (Step 3.2 - Manual Test)

**For Phase A (Sandbox - No ALB):**

1. **Launch 1 Frontend Instance Manually** (for testing):
   - **EC2** → **Launch Instance**
   - Name: `frontend-test`
   - AMI: Amazon Linux 2023
   - Instance type: t2.micro
   - **Key pair**: `project-key` (same as bastion)
   - **Network**: `project-vpc`
   - **Subnet**: `public-a` (Phase A) or `private-fe-a` (Phase B testing via Bastion)
   - **Auto-assign public IP**: **Enable** (Phase A) or **Disable** (Phase B)
   - **Security Group**: `SG-FE` (ensure HTTP from 0.0.0.0/0 for Phase A)
   - **User data**: Copy from frontend-template above

2. **Wait**: 3-5 minutes for user data script to execute

3. **Check User Data Logs** (via Bastion):
```powershell
# SSH to bastion first
ssh -i YOUR_KEY.pem ec2-user@BASTION_IP

# From bastion, SSH to frontend EC2 private IP
ssh ec2-user@FRONTEND_PRIVATE_IP

# Check if user data script ran successfully
sudo cat /var/log/cloud-init-output.log | tail -50

# Check if Nginx is running
sudo systemctl status nginx

# Check if frontend files exist
ls -la /usr/share/nginx/html/
```

**Expected Results**:
- `cloud-init-output.log` shows no errors
- Nginx status: `active (running)`
- Frontend files exist in `/usr/share/nginx/html/`

4. **Test via Browser**:
```
http://FRONTEND_PUBLIC_IP
```
You should see your React app homepage!

**If fails**:
- Check `cloud-init-output.log` for errors
- Verify GitHub repo URL in user data is correct
- Check if `npm install` completed: `ls /opt/app/frontend/node_modules`
- Manually run build: `cd /opt/app/frontend && npm run build`

---

#### ✅ Test 3: After Backend EC2 Launch (Step 3.3 - Manual Test)

**Before testing backend, deploy RDS first (Step 4) so backend can connect to database!**

1. **Launch 1 Backend Instance Manually**:
   - **EC2** → **Launch Instance**
   - Name: `backend-test`
   - AMI: Amazon Linux 2023
   - Instance type: t2.micro
   - **Key pair**: `project-key` (same as bastion)
   - **Network**: `project-vpc`
   - **Subnet**: `public-a` (Phase A) or `private-be-a` (Phase B testing via Bastion)
   - **Auto-assign public IP**: **Enable** (Phase A) or **Disable** (Phase B)
   - **Security Group**: `SG-BE` (ensure port 3000 from 0.0.0.0/0 for Phase A)
   - **User data**: Copy from backend-template above (update RDS endpoint!)

2. **Wait**: 3-5 minutes

3. **Check Backend via Bastion**:
```powershell
# SSH to bastion → backend
ssh -i YOUR_KEY.pem ec2-user@BASTION_IP
ssh ec2-user@BACKEND_PRIVATE_IP

# Check user data logs
sudo cat /var/log/cloud-init-output.log | tail -50

# Check if .env file was created
cat /opt/app/backend/.env

# Check if PM2 is running backend
pm2 list
pm2 logs api --lines 20
```

**Expected Results**:
- `.env` file exists with RDS endpoint
- PM2 shows `api` process with status `online`
- Logs show: `✓ Server listening on http://localhost:3000` and `✓ Connected to PostgreSQL database`

4. **Test API Endpoint**:
```powershell
# From your local machine
curl http://BACKEND_PUBLIC_IP:3000/api/tasks
```

**Expected**: JSON response `[]` or list of tasks

**If fails**:
- Check RDS endpoint in `.env` is correct
- Verify SG-DB allows port 5432 from SG-BE
- Check backend logs: `pm2 logs api`
- Test RDS connectivity from backend: `psql -h RDS_ENDPOINT -U postgres -d taskdb`

---

#### ✅ Test 4: After RDS Creation (Step 4.2)

**Wait**: 10-15 minutes for RDS to become available

**Test Database Connectivity**:
```powershell
# SSH to backend EC2 (via bastion)
ssh -i YOUR_KEY.pem ec2-user@BASTION_IP
ssh ec2-user@BACKEND_PRIVATE_IP

# Install PostgreSQL client
sudo yum install -y postgresql15

# Test connection to RDS
psql -h YOUR_RDS_ENDPOINT -U postgres -d taskdb
# Enter password when prompted

# Inside psql, check tables
\dt
SELECT * FROM tasks;
\q
```

**Expected Results**:
- Connection succeeds (no timeout or refused)
- `tasks` table exists
- Can query data

**If fails**:
- Check SG-DB inbound rules allow 5432 from SG-BE
- Verify RDS is in `available` state (Console)
- Check RDS endpoint spelling in `.env`
- Ensure DB_SSL=true if connecting from EC2

---

#### ✅ Test 5: After ALB Creation (Step 3.4 - Phase B Only)

**Wait**: 2-3 minutes for ALB to become active

1. **Check ALB Health**:
   - **EC2** → **Load Balancers** → Select `frontend-alb`
   - **Target Groups** → `frontend-tg` → **Targets** tab
   - Status should show `healthy` for registered instances

2. **Test ALB Endpoint**:
```powershell
# Get ALB DNS from Console
# EC2 → Load Balancers → frontend-alb → DNS name

# Test in browser
http://FRONTEND_ALB_DNS_NAME
```

**Expected**: React app loads via ALB

**If fails**:
- Target health shows `unhealthy`: Check SG-FE allows port 80 from SG-ALB-External
- No targets registered: Auto Scaling Group might not be attached to target group
- Connection timeout: Check ALB security group allows 80/443 from 0.0.0.0/0

---

#### ✅ Test 6: End-to-End Test (After All Steps)

**Test complete user flow:**

1. **Open Frontend** (via ALB or EC2 public IP)
2. **Create Task**: Fill title "Test Task" → Click "Ajouter"
3. **Verify Database**: SSH to backend → `psql` → `SELECT * FROM tasks;`
4. **Update Task**: Edit title to "Updated Task" → Save
5. **Change Status**: Dropdown → "Doing"
6. **Delete Task**: Click 🗑️ → Confirm

**All should work without errors!**

---

### Testing Best Practices

✅ **DO**:
- Test after each major step (bastion → frontend → backend → RDS → ALB)
- Check user data logs before assuming instance is ready
- Verify security groups allow required traffic
- Use Bastion to access private instances
- Keep manual test instances running until ASG is verified

❌ **DON'T**:
- Launch Auto Scaling Groups before testing launch templates manually
- Skip checking `cloud-init-output.log` (most failures are in user data)
- Delete test instances until confirming ASG works
- Assume "running" status means application is ready (wait for user data to finish)

---

### Quick Troubleshooting Commands

**Check if user data finished:**
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

**Test internal connectivity:**
```bash
# From frontend EC2, test backend ALB
curl http://BACKEND_ALB_INTERNAL_DNS:3000/api/tasks

# From backend EC2, test RDS
pg_isready -h YOUR_RDS_ENDPOINT -p 5432
```

---

### Step 4: Deploy Amazon RDS

#### 4.1 Create DB Subnet Group
1. **RDS** → **Subnet groups** → **Create**
2. Settings:
   - Name: `db-subnet-group`
   - VPC: `project-vpc`
   - Add subnets: `private-db-a`, `private-db-b`

#### 4.2 Create RDS Instance
1. **RDS** → **Create database**
2. Settings:
   - Engine: PostgreSQL 15
   - Template: Production
   - DB instance identifier: `project-db`
   - Master username: `postgres`
   - Master password: (save securely)
   - Instance class: db.t3.micro
   - **Multi-AZ**: ✅ Enable
   - VPC: `project-vpc`
   - DB subnet group: `db-subnet-group`
   - Security group: `SG-DB`
   - Initial database name: `taskdb`
   - Backup retention: 7 days
   - Enable automated backups: ✅

3. **After creation**, note the endpoint (e.g., `project-db.xxx.eu-west-1.rds.amazonaws.com`)

---

### Step 5: Deploy S3 and CloudFront

#### 5.1 Create S3 Bucket
1. **S3** → **Create bucket**
2. Settings:
   - Name: `project-static-assets-UNIQUEID`
   - Region: Same as VPC
   - Block all public access: ✅ (CloudFront will access it)
3. Upload static files (images, CSS, JS libraries)

#### 5.2 Create CloudFront Distribution
1. **CloudFront** → **Create distribution**
2. Settings:
   - Origin domain: Select your S3 bucket
   - Origin access: Origin access control (OAI)
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Allowed HTTP methods: GET, HEAD
   - Cache policy: CachingOptimized
   - Price class: Use all edge locations
3. After creation, update S3 bucket policy to allow CloudFront

---

### Step 6: Security and Monitoring

#### 6.1 Configure CloudWatch Alarms
1. **CloudWatch** → **Alarms** → **Create alarm**

**CPU Alarm (Frontend)**:
- Metric: EC2 → By Auto Scaling Group → `frontend-asg` → CPUUtilization
- Threshold: > 70%
- Period: 5 minutes
- Actions: Send to SNS topic

**CPU Alarm (Backend)**:
- Same for `backend-asg`

**RDS CPU Alarm**:
- Metric: RDS → By Database → `project-db` → CPUUtilization
- Threshold: > 70%

#### 6.2 Create SNS Topic
1. **SNS** → **Topics** → **Create topic**
2. Name: `project-alerts`
3. Type: Standard
4. Create subscription:
   - Protocol: Email
   - Endpoint: your-email@example.com
5. Confirm subscription via email

#### 6.3 Enable CloudTrail
1. **CloudTrail** → **Create trail**
2. Settings:
   - Name: `project-trail`
   - Storage: Create new S3 bucket
   - Log events: All management events
3. Enable

#### 6.4 Configure ACM (SSL Certificates)
1. **Certificate Manager** → **Request certificate**
2. Domain: `yourdomain.com` (or use ALB DNS)
3. Validation: DNS or Email
4. **After validation**, attach to ALB:
   - Go to ALB → Listeners
   - Add HTTPS:443 listener
   - Select ACM certificate
   - Forward to target group

#### 6.5 RDS Automated Backups
- Already enabled during RDS creation
- Verify: **RDS** → `project-db` → **Maintenance & backups**
- Backup retention: 7 days
- Backup window: Configure preferred time

---

## Phase 2: Container Migration (Step 7 - ECS)

### 7.1 Containerize Application

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

### 7.2 Push Images to ECR

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

### 7.3 Create ECS Cluster
1. **ECS** → **Clusters** → **Create cluster**
2. Settings:
   - Name: `project-cluster`
   - Infrastructure: AWS Fargate
   - VPC: `project-vpc`

### 7.4 Create Task Definitions

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

### 7.5 Create ECS Services
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

### 7.6 Configure Auto Scaling (ECS)
1. **Service** → **Auto Scaling**
2. Policy:
   - Type: Target tracking
   - Metric: ECSServiceAverageCPUUtilization
   - Target value: 70%
   - Min tasks: 2
   - Max tasks: 4

---

## Step 8: Documentation

### Architecture Diagram
Create diagrams showing:
- Network topology (VPC, subnets, routing)
- Application flow (ALB → EC2/ECS → RDS)
- Security (SGs, IAM roles)
- Monitoring (CloudWatch, SNS)

### Configuration Details
Document:
- All CIDR blocks
- Security group rules
- RDS connection strings
- S3 bucket names
- CloudFront distribution URL

### Deployment Steps
This document serves as the deployment guide.

### Cost Optimization Notes
- Use t2.micro/t3.micro instances (Free Tier eligible for 1 year)
- Enable Auto Scaling to scale down during low traffic
- Use S3 Lifecycle policies for old backups
- Monitor costs via AWS Cost Explorer

---

## Testing Checklist

- [ ] Access application via ALB DNS
- [ ] Verify both frontend instances are healthy
- [ ] Verify both backend instances are healthy
- [ ] Test database connectivity
- [ ] Trigger Auto Scaling (stress test CPU)
- [ ] Verify CloudWatch alarms trigger
- [ ] Confirm SNS notifications received
- [ ] Test Bastion SSH access
- [ ] Verify RDS Multi-AZ failover
- [ ] Test CloudFront CDN delivery

---

## Troubleshooting

### EC2 instances not joining target group
- Check security groups allow health check traffic
- Verify user data script executed successfully
- SSH via Bastion and check application logs

### RDS connection refused
- Verify SG-DB allows port 5432 from SG-BE
- Check RDS endpoint in backend `.env`
- Ensure DB_SSL=true for RDS connections

### Auto Scaling not triggering
- Verify CloudWatch metrics are being collected
- Check scaling policy thresholds
- Review IAM roles for Auto Scaling

---

**Project Complete!** You now have a production-ready, highly available, auto-scaling 3-tier application on AWS that meets all teacher requirements.
