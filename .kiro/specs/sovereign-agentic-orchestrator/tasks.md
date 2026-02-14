# Implementation Plan: Sovereign Agentic Orchestrator

## Overview

This implementation plan breaks down the Sovereign Agentic Orchestrator into discrete, incremental coding tasks. The system is built using TypeScript on AWS serverless infrastructure, integrating with national digital infrastructure (ONDC, ABDM, AgriStack, ShramSetu) through standardized protocols (Beckn, FHIR, W3C VC).

The implementation follows an incremental approach where each task builds on previous work, with property-based tests integrated throughout to catch errors early. All tasks reference specific requirements for traceability.

## Tasks

- [ ] 1. Set up project infrastructure and core types
  - Initialize TypeScript project with strict configuration
  - Set up AWS CDK for infrastructure as code
  - Define core TypeScript interfaces (WorkerProfile, Intent, Credential, Transaction)
  - Configure ESLint, Prettier, and Jest
  - Set up fast-check for property-based testing
  - _Requirements: All (foundational)_

- [ ] 2. Implement TOPSIS Engine with Referee Pattern
  - [ ] 2.1 Implement TOPSIS mathematical core
    - Write normalization function for decision matrices
    - Implement weighted matrix calculation
    - Calculate ideal positive and negative solutions
    - Implement Euclidean distance calculations
    - Calculate closeness coefficients using C_i* = d_i^- / (d_i^+ + d_i^-)
    - _Requirements: 6.1, 4.3, 16.4_
  
  - [ ]* 2.2 Write property test for TOPSIS mathematical correctness
    - **Property 35: TOPSIS Mathematical Correctness**
    - **Validates: Requirements 6.1**
  
  - [ ] 2.3 Implement TOPSIS explanation generator
    - Generate trade-off explanations in plain language
    - Create comparison matrices for display
    - Format scoring breakdowns
    - _Requirements: 6.2, 3.5, 4.5_
  
  - [ ]* 2.4 Write property test for multi-option comparison
    - **Property 36: Multi-Option Comparison Display**
    - **Validates: Requirements 6.2**


- [ ] 3. Implement CeRAI Legal Safety Filter and Kill-Switch
  - [ ] 3.1 Implement CeRAI safety score calculator
    - Implement legal bias detection component
    - Implement context sensitivity assessment
    - Implement regulatory compliance validation
    - Implement cultural appropriateness scoring
    - Calculate weighted overall safety score
    - _Requirements: 8.3, 8.11_
  
  - [ ]* 3.2 Write property test for safety score calculation
    - **Property 47: CeRAI Legal Safety Score Calculation**
    - **Validates: Requirements 8.3**
  
  - [ ] 3.3 Implement safety threshold enforcement
    - Block advice with safety score < 0.8
    - Generate expert consultation recommendations
    - Display safety scores for financial/medical advice
    - _Requirements: 6.4, 6.5, 8.4_
  
  - [ ]* 3.4 Write property test for safety threshold enforcement
    - **Property 38: Safety Threshold Expert Referral**
    - **Validates: Requirements 6.5, 8.4**
  
  - [ ] 3.5 Implement ICMR-compliant kill-switch mechanism
    - Create kill-switch activation handler
    - Implement workflow state preservation
    - Implement expert notification system
    - Integrate with AWS Step Functions as Human-Override state
    - _Requirements: 8.5, 8.6_
  
  - [ ]* 3.6 Write property test for kill-switch availability
    - **Property 48: Kill-Switch Availability for High-Stakes Decisions**
    - **Validates: Requirements 8.5**

- [ ] 4. Implement Bhashini language integration
  - [ ] 4.1 Create Bhashini service client
    - Implement ASR (Automatic Speech Recognition) client
    - Implement TTS (Text-to-Speech) client
    - Implement language detection
    - Implement translation service
    - Handle API authentication and rate limiting
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ]* 4.2 Write property test for automatic language detection
    - **Property 2: Automatic Language Detection**
    - **Validates: Requirements 1.2**
  
  - [ ] 4.3 Implement code-mixing analysis
    - Detect code-mixed patterns (Hinglish, Tanglish)
    - Identify primary and secondary languages
    - Classify mixing patterns (intra-sentential, inter-sentential, tag-switching)
    - _Requirements: 1.4, 17.2_
  
  - [ ]* 4.4 Write property test for code-mixed intent recognition
    - **Property 3: Code-Mixed Intent Recognition**
    - **Validates: Requirements 1.4, 17.2**
  
  - [ ] 4.5 Implement low-confidence clarification
    - Check transcription confidence scores
    - Generate clarification requests
    - Handle re-transcription workflows
    - _Requirements: 1.5_
  
  - [ ]* 4.6 Write property test for low-confidence clarification
    - **Property 4: Low-Confidence Clarification**
    - **Validates: Requirements 1.5**

- [ ] 5. Checkpoint - Ensure core safety and language components work
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 6. Implement ShramSetu W3C Verifiable Credentials connector
  - [ ] 6.1 Implement DID (Decentralized Identifier) management
    - Generate W3C-compliant DIDs
    - Implement DID resolution
    - Store DID documents
    - _Requirements: 2.1, 2.4_
  
  - [ ]* 6.2 Write property test for unique DID creation
    - **Property 7: Unique DID Creation**
    - **Validates: Requirements 2.1**
  
  - [ ] 6.3 Implement Verifiable Credential issuance
    - Create VC data structures following W3C standards
    - Implement Ed25519 cryptographic signing
    - Generate cryptographic proofs
    - Issue credentials to ShramSetu registry
    - _Requirements: 2.2, 2.4_
  
  - [ ]* 6.4 Write property test for W3C VC compliance
    - **Property 8: W3C Verifiable Credential Compliance**
    - **Validates: Requirements 2.2, 2.4**
  
  - [ ] 6.5 Implement credential verification
    - Verify cryptographic signatures
    - Validate credential expiry
    - Check issuer trust anchor status
    - _Requirements: 2.2, 2.3_
  
  - [ ] 6.6 Implement consent-based credential sharing
    - Check worker consent before sharing
    - Block unauthorized verification requests
    - Log all verification attempts
    - _Requirements: 2.6_
  
  - [ ]* 6.7 Write property test for consent-based sharing
    - **Property 10: Consent-Based Credential Sharing**
    - **Validates: Requirements 2.6**
  
  - [ ] 6.8 Implement multi-issuer credential aggregation
    - Aggregate credentials from multiple trust anchors
    - Create unified verifiable profiles
    - Handle credential conflicts
    - _Requirements: 2.7_
  
  - [ ]* 6.9 Write property test for credential aggregation
    - **Property 11: Multi-Issuer Credential Aggregation**
    - **Validates: Requirements 2.7**
  
  - [ ] 6.10 Implement immutable audit trail
    - Log all profile updates
    - Maintain tamper-proof audit records
    - Make audit trail visible to workers
    - _Requirements: 2.5_
  
  - [ ]* 6.11 Write property test for audit trail immutability
    - **Property 9: Immutable Audit Trail**
    - **Validates: Requirements 2.5**


- [ ] 7. Implement ONDC Beckn Gateway Protocol connector
  - [ ] 7.1 Implement Beckn protocol message structures
    - Define BecknContext, BecknSearchIntent, BecknCatalog types
    - Implement Beckn message signing
    - Handle Beckn protocol versioning
    - _Requirements: 4.1_
  
  - [ ] 7.2 Implement Beckn search operation
    - Create search intent from worker request
    - Broadcast search to ONDC gateway
    - Aggregate catalog responses from multiple providers
    - _Requirements: 4.1_
  
  - [ ]* 7.3 Write property test for ONDC buyer discovery
    - **Property 23: ONDC Buyer Discovery**
    - **Validates: Requirements 4.1**
  
  - [ ] 7.4 Implement Beckn select, init, confirm operations
    - Implement select (get quote)
    - Implement init (create order draft)
    - Implement confirm (finalize order)
    - Handle Beckn protocol state transitions
    - _Requirements: 4.4_
  
  - [ ] 7.5 Implement autonomous procurement agent
    - Query multiple ONDC providers in parallel
    - Use TOPSIS to rank logistics options
    - Optimize for worker benefit (not platform revenue)
    - Generate transparent scoring explanations
    - _Requirements: 4.2, 4.3, 4.8_
  
  - [ ]* 7.6 Write property test for autonomous negotiation
    - **Property 24: Autonomous Multi-Provider Negotiation**
    - **Validates: Requirements 4.2**
  
  - [ ]* 7.7 Write property test for worker-benefit optimization
    - **Property 29: Worker-Benefit Optimization**
    - **Validates: Requirements 4.8**
  
  - [ ] 7.8 Implement worker approval workflow
    - Present negotiation summary to worker
    - Require explicit approval before finalizing
    - Handle approval/rejection
    - _Requirements: 4.6_
  
  - [ ]* 7.9 Write property test for explicit worker approval
    - **Property 27: Explicit Worker Approval**
    - **Validates: Requirements 4.6**

- [ ] 8. Implement ABDM Health Information Provider (HIP) interface
  - [ ] 8.1 Implement FHIR resource handlers
    - Create FHIR Patient resources
    - Create FHIR Observation resources
    - Create FHIR Condition resources
    - Create FHIR MedicationRequest resources
    - Validate FHIR schema compliance
    - _Requirements: 5.2_
  
  - [ ]* 8.2 Write property test for FHIR schema compliance
    - **Property 31: FHIR Schema Compliance**
    - **Validates: Requirements 5.2**
  
  - [ ] 8.3 Implement ABDM consent management
    - Request patient consent via ABDM
    - Store granular consent records
    - Enforce consent before data access
    - _Requirements: 5.6_
  
  - [ ]* 8.4 Write property test for granular consent management
    - **Property 34: Granular Consent Management**
    - **Validates: Requirements 5.6**
  
  - [ ] 8.5 Implement multi-provider record retrieval
    - Query ABDM for linked providers
    - Retrieve FHIR bundles from all providers
    - Merge records into unified view
    - _Requirements: 5.1_
  
  - [ ]* 8.6 Write property test for multi-provider retrieval
    - **Property 30: Multi-Provider FHIR Record Retrieval**
    - **Validates: Requirements 5.1**
  
  - [ ] 8.7 Implement role-based access control
    - Define healthcare worker roles
    - Enforce RBAC on health data access
    - Log all access attempts
    - Block unauthorized access
    - _Requirements: 5.4_
  
  - [ ]* 8.8 Write property test for RBAC enforcement
    - **Property 32: Role-Based Access Control Enforcement**
    - **Validates: Requirements 5.4**
  
  - [ ] 8.9 Implement end-to-end health data encryption
    - Encrypt health records with AES-256
    - Use AWS KMS for key management
    - Implement end-to-end encryption for transmissions
    - _Requirements: 5.5_
  
  - [ ]* 8.10 Write property test for health data encryption
    - **Property 33: End-to-End Health Data Encryption**
    - **Validates: Requirements 5.5**

- [ ] 9. Checkpoint - Ensure national infrastructure connectors work
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 10. Implement Amazon Bedrock integration
  - [ ] 10.1 Create Bedrock client wrapper
    - Initialize Bedrock runtime client
    - Implement model invocation with streaming
    - Handle API rate limiting and retries
    - Configure Claude 3.5 Sonnet and Titan models
    - _Requirements: 3.1, 10.3_
  
  - [ ] 10.2 Implement intent extraction with Claude
    - Create prompt templates for intent extraction
    - Parse Claude responses into structured Intent objects
    - Handle code-mixed language inputs
    - Extract entities from vernacular text
    - _Requirements: 1.4, 17.2_
  
  - [ ] 10.3 Implement Titan multi-modal vision analysis
    - Create image preprocessing pipeline
    - Invoke Titan for crop/pest identification
    - Parse vision analysis results
    - Generate confidence scores
    - _Requirements: 3.1, 14.1_
  
  - [ ]* 10.4 Write property test for crop identification accuracy
    - **Property 13: Crop and Pest Identification Accuracy**
    - **Validates: Requirements 3.1, 14.1**
  
  - [ ] 10.5 Implement incremental response streaming
    - Stream Claude responses incrementally
    - Handle partial response rendering
    - Implement streaming error recovery
    - _Requirements: 10.3_
  
  - [ ]* 10.6 Write property test for incremental streaming
    - **Property 58: Incremental Response Streaming**
    - **Validates: Requirements 10.3**

- [ ] 11. Implement AgriStack and VISTAAR advisory engine
  - [ ] 11.1 Create AgriStack connector
    - Implement farmer profile retrieval
    - Implement soil health data queries
    - Implement weather forecast integration
    - Query ICAR pest/disease databases
    - _Requirements: 3.2, 3.3_
  
  - [ ] 11.2 Integrate Bharat Data Sagar
    - Connect to Bharat Data Sagar API
    - Query regional agricultural datasets
    - Retrieve crop-specific best practices
    - Access regional pest patterns
    - _Requirements: 3.4, 15.3_
  
  - [ ] 11.3 Implement VISTAAR personalization engine
    - Combine data from AgriStack, ICAR, Bharat Data Sagar
    - Generate hyper-personalized recommendations
    - Incorporate farmer's historical outcomes
    - Use TOPSIS to rank intervention options
    - _Requirements: 3.2, 3.5, 15.2_
  
  - [ ]* 11.4 Write property test for multi-source data integration
    - **Property 14: Multi-Source Data Integration**
    - **Validates: Requirements 3.2, 3.3**
  
  - [ ]* 11.5 Write property test for TOPSIS trade-off explanation
    - **Property 15: TOPSIS Trade-off Explanation**
    - **Validates: Requirements 3.5**
  
  - [ ] 11.6 Implement advisory completeness checks
    - Ensure cost estimates are included
    - Ensure expected outcomes are included
    - Validate all required fields present
    - _Requirements: 3.7_
  
  - [ ]* 11.7 Write property test for advisory completeness
    - **Property 17: Advisory Completeness**
    - **Validates: Requirements 3.7**
  
  - [ ] 11.8 Implement confidence-based expert referral
    - Check pest identification confidence
    - Recommend expert consultation for confidence < 80%
    - Generate confidence score explanations
    - _Requirements: 3.6_
  
  - [ ]* 11.9 Write property test for low-confidence expert referral
    - **Property 16: Low-Confidence Expert Referral**
    - **Validates: Requirements 3.6**


- [ ] 12. Implement OCEN 4.0 flow-based credit connector
  - [ ] 12.1 Implement flow-based credit score calculator
    - Retrieve transaction history from ONDC and ShramSetu
    - Calculate average monthly income
    - Calculate income stability score
    - Analyze transaction volume
    - Incorporate repayment history
    - Calculate final credit score (300-900 range)
    - _Requirements: 16.1, 16.2_
  
  - [ ]* 12.2 Write property test for transaction history retrieval
    - **Property 82: Transaction History Retrieval for Credit**
    - **Validates: Requirements 16.1**
  
  - [ ]* 12.3 Write property test for flow-based lending methodology
    - **Property 83: Flow-Based Lending Methodology**
    - **Validates: Requirements 16.2**
  
  - [ ] 12.4 Implement OCEN lending partner discovery
    - Connect to OCEN 4.0 API
    - Discover lending partners based on credit score
    - Retrieve loan offers from multiple lenders
    - _Requirements: 16.3_
  
  - [ ]* 12.5 Write property test for OCEN lending partner discovery
    - **Property 84: OCEN Lending Partner Discovery**
    - **Validates: Requirements 16.3**
  
  - [ ] 12.6 Implement TOPSIS loan comparison
    - Rank loan offers by interest rate, terms, total cost
    - Generate transparent comparison matrix
    - Explain trade-offs to worker
    - _Requirements: 16.4_
  
  - [ ]* 12.7 Write property test for TOPSIS loan comparison
    - **Property 85: TOPSIS Loan Comparison**
    - **Validates: Requirements 16.4**
  
  - [ ] 12.8 Implement digital loan disbursement
    - Facilitate loan application through OCEN
    - Handle disbursement without physical documents
    - Track loan status
    - _Requirements: 16.5_
  
  - [ ]* 12.9 Write property test for digital disbursement
    - **Property 86: Digital Loan Disbursement**
    - **Validates: Requirements 16.5**
  
  - [ ] 12.10 Implement credit profile auto-update
    - Track repayment history
    - Automatically update credit profile on positive repayments
    - Unlock better loan terms
    - _Requirements: 16.7_
  
  - [ ]* 12.11 Write property test for credit profile updates
    - **Property 87: Credit Profile Auto-Update**
    - **Validates: Requirements 16.7**
  
  - [ ] 12.12 Implement credit denial explanation
    - Identify specific factors for denial
    - Generate actionable improvement suggestions
    - Explain in worker's native language
    - _Requirements: 16.8_
  
  - [ ]* 12.13 Write property test for denial explanation
    - **Property 88: Credit Denial Explanation**
    - **Validates: Requirements 16.8**

- [ ] 13. Checkpoint - Ensure credit and advisory systems work
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 14. Implement AWS Step Functions saga orchestration
  - [ ] 14.1 Define saga workflow state machines
    - Create ONDC order saga with credit integration
    - Define compensating transactions for each step
    - Implement error handling and retry logic
    - Add human-override states for kill-switch
    - _Requirements: 12.2, 12.5_
  
  - [ ] 14.2 Implement saga execution engine
    - Execute saga steps sequentially
    - Handle step failures with compensation
    - Maintain workflow state
    - Log execution history
    - _Requirements: 12.2, 12.5_
  
  - [ ]* 14.3 Write property test for saga transactional consistency
    - **Property 71: Saga Pattern Transactional Consistency**
    - **Validates: Requirements 12.5**
  
  - [ ] 14.4 Implement exponential backoff retry
    - Retry failed steps with exponential backoff
    - Add jitter to prevent thundering herd
    - Limit to 3 retry attempts
    - _Requirements: 12.3_
  
  - [ ]* 14.5 Write property test for exponential backoff retry
    - **Property 69: Exponential Backoff Retry**
    - **Validates: Requirements 12.3**
  
  - [ ] 14.6 Implement failure escalation
    - Escalate to human operator after all retries fail
    - Notify worker of delays
    - Preserve workflow state for manual intervention
    - _Requirements: 12.4_
  
  - [ ]* 14.7 Write property test for failure escalation
    - **Property 70: Failure Escalation**
    - **Validates: Requirements 12.4**
  
  - [ ] 14.8 Implement workflow completion summary
    - Generate summary of all actions taken
    - Include outcomes for each step
    - Present to worker in native language
    - _Requirements: 12.6_
  
  - [ ]* 14.9 Write property test for workflow completion summary
    - **Property 72: Workflow Completion Summary**
    - **Validates: Requirements 12.6**

- [ ] 15. Implement Bedrock Agent orchestrator
  - [ ] 15.1 Create Bedrock Agent configuration
    - Define agent instructions and capabilities
    - Configure Claude 3.5 Sonnet as foundation model
    - Set up agent action groups
    - Configure knowledge bases
    - _Requirements: 12.1_
  
  - [ ] 15.2 Implement task decomposition
    - Decompose complex requests into sub-tasks
    - Assign sub-tasks to specialized agents
    - Coordinate parallel execution
    - _Requirements: 12.1_
  
  - [ ]* 15.3 Write property test for task decomposition
    - **Property 67: Complex Request Task Decomposition**
    - **Validates: Requirements 12.1**
  
  - [ ] 15.4 Implement Step Functions coordination
    - Integrate Bedrock Agents with Step Functions
    - Handle agent dependencies
    - Coordinate multi-agent workflows
    - _Requirements: 12.2_
  
  - [ ]* 15.5 Write property test for Step Functions coordination
    - **Property 68: Step Functions Coordination**
    - **Validates: Requirements 12.2**


- [ ] 16. Implement offline-first capabilities
  - [ ] 16.1 Create offline cache manager
    - Implement IndexedDB storage for PWA
    - Cache advisories, credentials, and essential data
    - Implement cache invalidation strategy
    - _Requirements: 7.1_
  
  - [ ]* 16.2 Write property test for offline cache access
    - **Property 40: Offline Cache Access**
    - **Validates: Requirements 7.1**
  
  - [ ] 16.3 Implement offline action queue
    - Queue actions performed offline
    - Persist queue to local storage
    - Implement conflict resolution
    - _Requirements: 7.2_
  
  - [ ] 16.4 Implement online synchronization
    - Detect connectivity restoration
    - Sync queued actions to backend
    - Handle sync failures gracefully
    - _Requirements: 7.2, 7.3_
  
  - [ ]* 16.5 Write property test for offline action queuing and sync
    - **Property 41: Offline Action Queuing and Synchronization**
    - **Validates: Requirements 7.2**
  
  - [ ] 16.6 Implement offline feature availability indication
    - Detect offline mode
    - Display unavailable features
    - Show when features will be accessible
    - _Requirements: 7.4_
  
  - [ ]* 16.7 Write property test for feature availability indication
    - **Property 42: Offline Feature Availability Indication**
    - **Validates: Requirements 7.4**
  
  - [ ] 16.8 Implement predictive caching
    - Analyze worker usage patterns
    - Proactively cache likely-needed data
    - Prioritize critical data for offline access
    - _Requirements: 7.5_
  
  - [ ]* 16.9 Write property test for predictive caching
    - **Property 43: Predictive Caching**
    - **Validates: Requirements 7.5**
  
  - [ ] 16.10 Implement offline voice interaction
    - Store language models locally for PWA
    - Enable voice interaction without internet
    - Use cached Bhashini models
    - _Requirements: 7.6_
  
  - [ ]* 16.11 Write property test for offline voice interaction
    - **Property 44: Offline Voice Interaction**
    - **Validates: Requirements 7.6**

- [ ] 17. Implement data security and residency
  - [ ] 17.1 Implement AES-256 document encryption
    - Encrypt documents before S3 upload
    - Use AWS KMS for key management
    - Implement client-side encryption
    - _Requirements: 11.1_
  
  - [ ]* 17.2 Write property test for document encryption
    - **Property 62: AES-256 Document Encryption**
    - **Validates: Requirements 11.1**
  
  - [ ] 17.3 Implement document access authorization
    - Verify requester identity
    - Check authorization levels
    - Block unauthorized access
    - _Requirements: 11.2_
  
  - [ ]* 17.4 Write property test for document access authorization
    - **Property 63: Document Access Authorization**
    - **Validates: Requirements 11.2**
  
  - [ ] 17.5 Implement time-limited access tokens
    - Generate revocable access tokens
    - Set token expiration times
    - Implement token revocation
    - _Requirements: 11.3_
  
  - [ ]* 17.6 Write property test for time-limited tokens
    - **Property 64: Time-Limited Revocable Access Tokens**
    - **Validates: Requirements 11.3**
  
  - [ ] 17.7 Implement PII enhanced security
    - Detect PII in documents
    - Apply additional encryption layers
    - Implement enhanced access logging
    - _Requirements: 11.6_
  
  - [ ]* 17.8 Write property test for PII enhanced security
    - **Property 66: PII Enhanced Security**
    - **Validates: Requirements 11.6**
  
  - [ ] 17.9 Implement sovereign data residency enforcement
    - Ensure all sensitive data stored in ap-south-1
    - Validate compute operations occur in Indian regions
    - Generate cryptographic residency proofs
    - _Requirements: 18.1, 18.2, 18.3_
  
  - [ ]* 17.10 Write property test for data residency
    - **Property 89: Sensitive Data Regional Storage**
    - **Validates: Requirements 18.1, 18.2, 18.8**
  
  - [ ]* 17.11 Write property test for cryptographic residency proof
    - **Property 90: Cryptographic Residency Proof**
    - **Validates: Requirements 18.3**
  
  - [ ] 17.12 Implement data residency violation detection
    - Monitor data location continuously
    - Alert administrators on violations
    - Quarantine affected data
    - _Requirements: 18.6_
  
  - [ ]* 17.13 Write property test for violation detection
    - **Property 93: Residency Violation Detection**
    - **Validates: Requirements 18.6**

- [ ] 18. Checkpoint - Ensure security and offline capabilities work
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 19. Implement contextual learning and personalization
  - [ ] 19.1 Implement preference profile management
    - Track accepted/rejected recommendations
    - Update worker preference profiles
    - Store preferences encrypted and isolated
    - _Requirements: 15.1, 15.6_
  
  - [ ]* 19.2 Write property test for preference profile updates
    - **Property 76: Preference Profile Updates**
    - **Validates: Requirements 15.1**
  
  - [ ]* 19.3 Write property test for personalization data privacy
    - **Property 80: Personalization Data Privacy**
    - **Validates: Requirements 15.6**
  
  - [ ] 19.4 Implement outcome-based learning
    - Collect outcome feedback from workers
    - Incorporate outcomes into future recommendations
    - Weight explicit feedback more heavily
    - _Requirements: 15.2, 15.7_
  
  - [ ]* 19.5 Write property test for outcome-based refinement
    - **Property 77: Outcome-Based Advisory Refinement**
    - **Validates: Requirements 15.2**
  
  - [ ]* 19.6 Write property test for explicit feedback prioritization
    - **Property 81: Explicit Feedback Prioritization**
    - **Validates: Requirements 15.7**
  
  - [ ] 19.7 Implement seasonal adaptation
    - Detect seasonal patterns
    - Adjust recommendations based on time of year
    - Incorporate local seasonal conditions
    - _Requirements: 15.4_
  
  - [ ]* 19.8 Write property test for seasonal adaptation
    - **Property 78: Seasonal Recommendation Adaptation**
    - **Validates: Requirements 15.4**
  
  - [ ] 19.9 Implement context change detection
    - Detect significant context changes
    - Request confirmation before applying outdated preferences
    - Update context gracefully
    - _Requirements: 15.5_
  
  - [ ]* 19.10 Write property test for context change confirmation
    - **Property 79: Context Change Confirmation**
    - **Validates: Requirements 15.5**

- [ ] 20. Implement skill verification system
  - [ ] 20.1 Create multi-modal assessment engine
    - Generate assessments appropriate to skill domain
    - Support text, video, and practical assessments
    - Integrate with Bedrock for evaluation
    - _Requirements: 9.1, 9.6_
  
  - [ ]* 20.2 Write property test for multi-modal assessment provision
    - **Property 54: Multi-Modal Assessment Provision**
    - **Validates: Requirements 9.1**
  
  - [ ] 20.3 Implement video submission analysis
    - Accept video submissions
    - Analyze using Titan computer vision
    - Evaluate practical demonstrations
    - _Requirements: 9.6_
  
  - [ ]* 20.4 Write property test for video analysis
    - **Property 57: Video Submission Computer Vision Analysis**
    - **Validates: Requirements 9.6**
  
  - [ ] 20.5 Implement borderline score handling
    - Detect borderline assessment results
    - Recommend training resources
    - Offer re-assessment pathways
    - _Requirements: 9.4_
  
  - [ ]* 20.6 Write property test for borderline handling
    - **Property 55: Borderline Score Training Recommendation**
    - **Validates: Requirements 9.4**
  
  - [ ] 20.7 Implement credential expiry notification
    - Track credential expiration dates
    - Send notifications 30 days in advance
    - Offer renewal pathways
    - _Requirements: 9.5_
  
  - [ ]* 20.8 Write property test for expiry notification
    - **Property 56: Credential Expiry Notification**
    - **Validates: Requirements 9.5**


- [ ] 21. Implement Lambda functions and API Gateway
  - [ ] 21.1 Create base Lambda handler
    - Implement BaseLambdaHandler abstract class
    - Add input validation
    - Add error handling and logging
    - Implement consistent error response format
    - _Requirements: All (foundational)_
  
  - [ ] 21.2 Implement intent extraction Lambda
    - Create handler for voice/text intent extraction
    - Integrate with Bedrock Claude
    - Return structured Intent objects
    - _Requirements: 1.4, 17.2_
  
  - [ ] 21.3 Implement TOPSIS calculation Lambda
    - Create handler for TOPSIS calculations
    - Accept options and criteria
    - Return ranked results with explanations
    - _Requirements: 6.1, 4.3, 16.4_
  
  - [ ] 21.4 Implement safety score Lambda
    - Create handler for CeRAI safety score calculation
    - Integrate with safety filter
    - Return safety scores and recommendations
    - _Requirements: 8.3, 8.4_
  
  - [ ] 21.5 Implement ONDC connector Lambdas
    - Create search, select, init, confirm handlers
    - Implement Beckn protocol message handling
    - Integrate with ONDC gateway
    - _Requirements: 4.1, 4.2, 4.4_
  
  - [ ] 21.6 Implement ABDM connector Lambdas
    - Create FHIR resource handlers
    - Implement consent management
    - Integrate with ABDM gateway
    - _Requirements: 5.1, 5.2, 5.6_
  
  - [ ] 21.7 Set up API Gateway
    - Define REST API endpoints
    - Configure authentication (Cognito)
    - Set up CORS
    - Configure rate limiting
    - _Requirements: All (foundational)_

- [ ] 22. Implement DynamoDB data layer
  - [ ] 22.1 Create DynamoDB table definitions
    - Define Workers table with GSIs
    - Define Credentials table with GSIs
    - Define Transactions table with GSIs
    - Define Advisories table with TTL
    - Define Workflows table with GSIs
    - _Requirements: All (foundational)_
  
  - [ ] 22.2 Implement data access layer
    - Create repository classes for each table
    - Implement CRUD operations
    - Add query and scan operations
    - Implement batch operations
    - _Requirements: All (foundational)_
  
  - [ ] 22.3 Implement data encryption at rest
    - Enable DynamoDB encryption
    - Use AWS KMS for key management
    - Ensure ap-south-1 residency
    - _Requirements: 18.1, 18.2_

- [ ] 23. Implement Progressive Web App frontend
  - [ ] 23.1 Set up React + TypeScript project
    - Initialize React app with TypeScript
    - Configure build tools (Vite)
    - Set up PWA manifest and service worker
    - Configure offline-first architecture
    - _Requirements: 7.1, 7.6_
  
  - [ ] 23.2 Implement glassmorphism UI components
    - Create translucent card components
    - Implement soft shadows and blur effects
    - Create large, clearly labeled buttons
    - Limit screens to 3 primary actions
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [ ]* 23.3 Write property test for UI action limit
    - **Property 73: UI Action Limit**
    - **Validates: Requirements 13.2**
  
  - [ ] 23.4 Implement voice interaction UI
    - Create voice input button
    - Display transcription in real-time
    - Show audio waveform visualization
    - Handle voice playback
    - _Requirements: 1.1, 1.3_
  
  - [ ] 23.5 Implement error handling UI
    - Display friendly error messages
    - Show clear next steps
    - Avoid technical jargon
    - _Requirements: 13.4_
  
  - [ ]* 23.6 Write property test for user-friendly error messages
    - **Property 74: User-Friendly Error Messages**
    - **Validates: Requirements 13.4**
  
  - [ ] 23.7 Implement responsive design
    - Support mobile, tablet, desktop
    - Maintain consistent visual language
    - Test across devices
    - _Requirements: 13.6_
  
  - [ ]* 23.8 Write property test for responsive design consistency
    - **Property 75: Responsive Design Consistency**
    - **Validates: Requirements 13.6**
  
  - [ ] 23.9 Implement offline mode UI
    - Show offline indicator
    - Display cached data
    - Show sync status
    - _Requirements: 7.4_

- [ ] 24. Checkpoint - Ensure frontend and backend integration works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 25. Implement AWS CDK infrastructure
  - [ ] 25.1 Define Lambda function constructs
    - Create CDK constructs for all Lambda functions
    - Configure memory, timeout, environment variables
    - Set up VPC configuration
    - Configure reserved and provisioned concurrency
    - _Requirements: All (foundational)_
  
  - [ ] 25.2 Define Step Functions state machines
    - Create CDK constructs for saga workflows
    - Define state machine definitions
    - Configure error handling and retries
    - _Requirements: 12.2, 12.5_
  
  - [ ] 25.3 Define DynamoDB tables
    - Create CDK constructs for all tables
    - Configure GSIs and LSIs
    - Set up auto-scaling
    - Enable point-in-time recovery
    - _Requirements: All (foundational)_
  
  - [ ] 25.4 Define S3 buckets
    - Create encrypted S3 buckets
    - Configure lifecycle policies
    - Set up CORS
    - Ensure ap-south-1 region
    - _Requirements: 11.1, 18.1_
  
  - [ ] 25.5 Define API Gateway
    - Create CDK construct for REST API
    - Configure Cognito authorizer
    - Set up custom domain
    - Configure throttling
    - _Requirements: All (foundational)_
  
  - [ ] 25.6 Define CloudWatch monitoring
    - Set up Lambda metrics and alarms
    - Configure X-Ray tracing
    - Create custom metrics for safety scores
    - Set up log aggregation
    - _Requirements: 10.6_
  
  - [ ] 25.7 Deploy to AWS ap-south-1
    - Configure CDK for ap-south-1 region
    - Deploy all stacks
    - Verify data residency
    - _Requirements: 18.1, 18.2_

- [ ] 26. Implement monitoring and observability
  - [ ] 26.1 Set up CloudWatch dashboards
    - Create dashboard for Lambda performance
    - Create dashboard for Step Functions execution
    - Create dashboard for safety score distribution
    - Create dashboard for data residency compliance
    - _Requirements: 10.6, 18.7_
  
  - [ ] 26.2 Implement X-Ray tracing
    - Enable X-Ray for all Lambdas
    - Trace distributed workflows
    - Identify performance bottlenecks
    - _Requirements: 10.6_
  
  - [ ] 26.3 Set up CloudWatch alarms
    - Create alarms for Lambda errors
    - Create alarms for high latency
    - Create alarms for data residency violations
    - Create alarms for safety score anomalies
    - _Requirements: 10.6, 18.6_
  
  - [ ] 26.4 Implement performance logging
    - Log response times > 5 seconds
    - Log safety score distributions
    - Log workflow execution times
    - _Requirements: 10.6_
  
  - [ ]* 26.5 Write property test for performance metric logging
    - **Property 61: Performance Metric Logging**
    - **Validates: Requirements 10.6**

- [ ] 27. Final integration and end-to-end testing
  - [ ]* 27.1 Run full property test suite
    - Execute all 94 property tests with 100 iterations each
    - Verify all properties pass
    - Document any failures
  
  - [ ]* 27.2 Run integration tests
    - Test end-to-end ONDC order flow with credit integration
    - Test ABDM health record sync
    - Test ShramSetu credential lifecycle
    - Test offline-to-online synchronization
  
  - [ ] 27.3 Verify data residency compliance
    - Audit all data storage locations
    - Verify compute operations in ap-south-1
    - Generate compliance report
    - _Requirements: 18.1, 18.2, 18.7_
  
  - [ ] 27.4 Verify safety guardrails
    - Test CeRAI safety score calculations
    - Test kill-switch activation
    - Test harmful request blocking
    - _Requirements: 8.1, 8.2, 8.5, 8.7_
  
  - [ ] 27.5 Performance testing
    - Load test with 10,000 concurrent users
    - Verify P95 latency < 2s
    - Verify error rate < 1%
    - _Requirements: 10.1, 10.2, 10.5_

- [ ] 28. Final checkpoint - System ready for deployment
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties with 100 iterations minimum
- Integration tests validate end-to-end workflows across national infrastructure
- All implementation uses TypeScript for type safety and maintainability
- Infrastructure deployed exclusively to AWS ap-south-1 for data sovereignty