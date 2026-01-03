# Quick Reference - AWS Deployment Guide

## 📋 Step-by-Step Deployment Checklist

### Step 1: VPC & Network (1-2 hours)
- [ ] Create VPC: 10.0.0.0/16
- [ ] Create 8 subnets (2 public, 2 FE private, 2 BE private, 2 DB private)
- [ ] Create Internet Gateway
- [ ] Create 2 NAT Gateways (one per AZ)
- [ ] Create route tables (public and private)

### Step 2: Security Groups (30 minutes)
- [ ] SG-LB (Load Balancer): HTTP:80, HTTPS:443 from 0.0.0.0/0
- [ ] SG-FE (Frontend): HTTP:80 from SG-LB, SSH:22 from SG-Bastion
- [ ] SG-BE (Backend): TCP:3000 from SG-LB, SSH:22 from SG-Bastion
- [ ] SG-DB (Database): TCP:5432 from SG-BE
- [ ] SG-Bastion: SSH:22 from YOUR_IP/32

### Step 3: Bastion & Templates (1 hour)
- [ ] Launch Bastion host (t2.micro, public-a)
- [ ] Create Frontend Launch Template
- [ ] Create Backend Launch Template
- [ ] Download/convert key pair to .ppk for PuTTY

### Step 4: Load Balancer (1 hour)
- [ ] Create Target Group: frontend-tg (port 80)
- [ ] Create Target Group: backend-tg (port 3000)
- [ ] Create ALB (project-alb)
- [ ] Add Listener 1: HTTP:80 → frontend-tg
- [ ] Add Listener 2: HTTP:3000 → backend-tg

### Step 5: Auto Scaling (1 hour)
- [ ] Create Frontend ASG (2-4 instances, target tracking CPU>70%)
- [ ] Create Backend ASG (2-4 instances, target tracking CPU>70%)
- [ ] Wait for instances to launch and become healthy

### Step 6: RDS Multi-AZ (15-20 minutes setup, 15-20 minutes for creation)
- [ ] Create DB Subnet Group
- [ ] Create RDS instance (PostgreSQL, Multi-AZ ENABLED)
- [ ] Update Backend Launch Template with RDS endpoint
- [ ] Wait 15-20 minutes for RDS to become available

### Step 7: S3, CloudFront, ACM & Monitoring (2-3 hours)

#### 7.1: S3 (20 minutes)
- [ ] Create S3 bucket (project-static-assets-UNIQUEID)
- [ ] Enable versioning
- [ ] Upload static assets
- [ ] Block public access

#### 7.2: CloudFront (15 minutes setup, 5-10 minutes deployment)
- [ ] Create CloudFront distribution
- [ ] Configure S3 origin with OAC
- [ ] Set cache policy to CachingOptimized
- [ ] Update S3 bucket policy for CloudFront

#### 7.3: ACM & HTTPS (15 minutes)
- [ ] Request ACM certificate (or skip for ALB DNS)
- [ ] Add HTTPS:443 listener to ALB
- [ ] Enable HTTP→HTTPS redirect (301)

#### 7.4: CloudWatch & Monitoring (30 minutes)
- [ ] Create CloudWatch alarms for CPU > 70%
- [ ] Create SNS topic and subscribe email
- [ ] Enable CloudTrail logging
- [ ] Configure RDS backups (already enabled)

### Step 8: Testing (1-2 hours)
- [ ] Connect to Bastion with PuTTY
- [ ] SSH to Frontend instance
- [ ] SSH to Backend instance
- [ ] Test API: curl https://ALB_DNS:3000/api/tasks
- [ ] Test UI: https://ALB_DNS
- [ ] Create/Update/Delete task
- [ ] Verify RDS data persistence
- [ ] Test Auto Scaling (stop instance)
- [ ] Test RDS failover (optional)

### Step 9: Optimization & Documentation (1 hour)
- [ ] Review CloudWatch metrics
- [ ] Document RDS endpoint, S3 name, CloudFront domain
- [ ] Create architecture diagram
- [ ] Verify all security groups
- [ ] Calculate final costs

---

## 🔑 Key PuTTY Commands

### Connect to Bastion
```
Host: ec2-user@BASTION_PUBLIC_IP
Port: 22
Auth: Private key (.ppk file)
```

### From Bastion to Frontend
```bash
ssh ec2-user@FRONTEND_PRIVATE_IP
```

### From Bastion to Backend
```bash
ssh ec2-user@BACKEND_PRIVATE_IP
```

### From Backend, connect to RDS
```bash
psql -h RDS_ENDPOINT -U postgres -d taskdb
```

---

## 📊 Key Resources

| Resource | Name | Details |
|----------|------|---------|
| VPC | project-vpc | 10.0.0.0/16 |
| Bastion | bastion-host | public-a, t2.micro |
| ALB | project-alb | Shared, 2 listeners |
| Frontend ASG | frontend-asg | 2-4 instances |
| Backend ASG | backend-asg | 2-4 instances |
| RDS | project-db | PostgreSQL, Multi-AZ |
| S3 Bucket | project-static-assets-UNIQUEID | Static assets |
| CloudFront | project-cdn | D*.cloudfront.net |
| SNS Topic | project-alerts | Email notifications |

---

## 💰 Cost Breakdown

| Component | Cost | Monthly |
|-----------|------|---------|
| RDS Multi-AZ | $35 | ✅ |
| EC2 (4x t2.micro) | $30 | ✅ |
| ALB | $25 | ✅ |
| NAT Gateways (2x) | $45 | ✅ |
| S3 | $5 | ✅ |
| CloudFront | $10 | ✅ |
| CloudWatch/CloudTrail | $5 | ✅ |
| Data Transfer | $5 | ✅ |
| **TOTAL** | **~$160** | **~$80/student** |

---

## 🔒 Security Checklist

- [ ] All RDS traffic from SG-BE only
- [ ] All backend traffic from ALB only (no direct internet)
- [ ] All frontend traffic from ALB only
- [ ] Bastion SSH only from your IP
- [ ] HTTPS enabled (port 443)
- [ ] HTTP redirects to HTTPS
- [ ] S3 bucket private (CloudFront only)
- [ ] CloudTrail logging enabled
- [ ] CloudWatch alarms configured

---

## ✅ Final Verification

### Network
- [ ] VPC created with 8 subnets
- [ ] IGW and NAT Gateways working
- [ ] Route tables correctly configured

### Security
- [ ] 5 Security Groups created
- [ ] All rules per specification
- [ ] HTTPS working (cert valid)

### Compute
- [ ] Bastion accessible via PuTTY
- [ ] Frontend instances healthy (2x)
- [ ] Backend instances healthy (2x)
- [ ] ALB shows healthy targets

### Database
- [ ] RDS Multi-AZ running
- [ ] Primary in AZ A, Standby in AZ B
- [ ] Automated backups enabled
- [ ] Can connect via psql

### Content Delivery
- [ ] S3 bucket created
- [ ] CloudFront distribution active
- [ ] Static assets accessible
- [ ] Cache working

### Application
- [ ] Frontend loads via HTTPS
- [ ] Backend API responds
- [ ] CRUD operations work
- [ ] Data persists in RDS

### Monitoring
- [ ] CloudWatch metrics visible
- [ ] SNS notifications working
- [ ] CloudTrail logging active
- [ ] Alarms can trigger

---

## 📖 Documentation Files

1. **AWS_COMPLETE_DEPLOYMENT.md** - Complete deployment guide
2. **COMPLIANCE_SUMMARY.md** - Requirement compliance verification
3. **CHANGES_SUMMARY.md** - Summary of all changes made
4. **QUICK_REFERENCE.md** - This document

---

**Time Estimate**: 10-12 hours total deployment  
**Cost per Student**: ~$80/month (2 students sharing)  
**Availability**: 99.95% (Multi-AZ architecture)  
**Status**: ✅ Production Ready

---

**Last Updated**: January 3, 2026
