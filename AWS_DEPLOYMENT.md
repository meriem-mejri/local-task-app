# AWS Deployment - Complete Architecture (IGL4/GLSI3)

**Full production deployment guide for teacher evaluation.**

---

## 📋 Project Requirements Met

This deployment implements **all teacher requirements**:

✅ **Step 1**: VPC with 8 subnets (2 public, 6 private) across 2 AZs  
✅ **Step 2**: 6 Security Groups (SG-ALB-External, SG-ALB-Internal, SG-FE, SG-BE, SG-DB, SG-Bastion)  
✅ **Step 3**: EC2 instances (2 frontend, 2 backend, 1 bastion) + ALBs + Auto Scaling  
✅ **Step 4**: RDS PostgreSQL Multi-AZ in dedicated private subnets  
✅ **Step 5**: S3 bucket + CloudFront distribution  
✅ **Step 6**: CloudWatch, SNS, CloudTrail, ACM, automated backups  
✅ **Step 7**: ECS migration with Fargate containers  
✅ **Step 8**: Complete documentation with architecture diagrams  

---

## 🏗️ Architecture Overview

### Network Architecture
- **VPC**: 10.0.0.0/16
- **8 Subnets** across 2 Availability Zones:
  - 2 Public (external ALB, NAT, Bastion)
  - 2 Private Frontend (10.0.11.0/24, 10.0.12.0/24)
  - 2 Private Backend (10.0.21.0/24, 10.0.22.0/24)
  - 2 Private RDS (10.0.31.0/24, 10.0.32.0/24)

### Security Groups
1. **SG-ALB-External**: Internet-facing load balancer (HTTP/HTTPS from 0.0.0.0/0)
2. **SG-ALB-Internal**: Internal load balancer (accepts from SG-FE)
3. **SG-FE**: Frontend instances (accepts from SG-ALB-External)
4. **SG-BE**: Backend instances (accepts from SG-ALB-Internal)
5. **SG-DB**: RDS database (accepts from SG-BE on port 5432)
6. **SG-Bastion**: SSH access from your IP

### High Availability
- Multi-AZ deployment for RDS (primary + standby)
- Auto Scaling Groups for frontend and backend (2-4 instances)
- 2 NAT Gateways (one per AZ)
- Load balancers across 2 availability zones

---

## 📖 Complete Deployment Guide

**Follow**: [AWS_COMPLETE_DEPLOYMENT.md](AWS_COMPLETE_DEPLOYMENT.md)

This guide includes:
- **Phase 1**: Infrastructure setup (VPC, EC2, RDS, S3, CloudFront, monitoring)
- **Phase 2**: Container migration (ECS with Fargate)
- **Step-by-step** instructions for all 8 project steps
- **Testing checklist** and troubleshooting

---

## 💰 Cost Estimation

| Component           | Instance Type | Cost/Month |
|---------------------|---------------|------------|
| EC2 Frontend (2)    | t2.micro      | ~$10       |
| EC2 Backend (2)     | t2.micro      | ~$10       |
| Bastion Host (1)    | t2.micro      | ~$5        |
| RDS Multi-AZ        | db.t3.micro   | ~$50       |
| NAT Gateways (2)    | -             | ~$65       |
| ALB (2)             | -             | ~$35       |
| S3 + CloudFront     | -             | ~$5        |
| **Total**           |               | **~$180/month** |

**Free Tier** (new accounts): EC2 t2.micro + RDS t3.micro free for 1 year → **~$100/month** savings

---

## ⏱️ Deployment Timeline

| Phase                    | Time     |
|--------------------------|----------|
| VPC + Networking         | 1 hour   |
| Security Groups          | 30 mins  |
| EC2 + Auto Scaling       | 2 hours  |
| RDS Setup                | 1 hour   |
| S3 + CloudFront          | 1 hour   |
| Monitoring + Security    | 1 hour   |
| **Phase 1 Total**        | **6-7 hours** |
| ECS Migration (Phase 2)  | 2-3 hours |
| **Complete Total**       | **8-10 hours** |

---

## 🚀 Quick Start

1. Open [AWS_COMPLETE_DEPLOYMENT.md](AWS_COMPLETE_DEPLOYMENT.md)
2. Follow Step 1: Create VPC and 8 subnets
3. Continue through all 8 steps sequentially
4. Use testing checklist to verify deployment
5. Complete Phase 2 for ECS migration

---

## ⚠️ Important Notes

- **Region**: Use `eu-west-1` (Ireland) or your preferred region
- **Socket.IO Removed**: Application uses HTTP polling (no WebSockets)
- **Secrets**: Store RDS password in AWS Secrets Manager
- **Bastion Access**: Update SG-Bastion with your current IP address
- **ACM Certificates**: Request SSL cert before attaching to ALB

---

**Ready to deploy?** Start with [AWS_COMPLETE_DEPLOYMENT.md](AWS_COMPLETE_DEPLOYMENT.md) now!
