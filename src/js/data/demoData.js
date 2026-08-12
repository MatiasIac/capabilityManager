/**
 * Demo seed data (FR-100 to FR-103).
 *
 * This is the ONLY place demonstration content is defined, so it can be
 * replaced later without touching application logic. `buildDemoState()`
 * returns a brand new, independent object graph every time it is called
 * (used for both first-launch seeding and "Reset Demo").
 */
(function (global) {
  'use strict';

  function def(levelId, statement, evidence) {
    return { levelId: levelId, statement: statement, evidence: evidence || '' };
  }

  function capability(id, domainId, code, name, description, order, mode, defs) {
    return {
      id: id,
      domainId: domainId,
      code: code,
      name: name,
      description: description || '',
      mode: mode || 'milestone',
      tags: [],
      order: order,
      maturityDefinitions: defs
    };
  }

  function buildDemoState() {
    var nowIso = new Date().toISOString();

    var levels = [
      { id: 'level-1', name: 'Level 1', shortLabel: 'L1', description: 'Entry-level awareness and foundational capability.', order: 1 },
      { id: 'level-2', name: 'Level 2', shortLabel: 'L2', description: 'Applies capability independently in common situations.', order: 2 },
      { id: 'level-3', name: 'Level 3', shortLabel: 'L3', description: 'Demonstrates solid, reliable capability, including some complexity.', order: 3 },
      { id: 'level-4', name: 'Level 4', shortLabel: 'L4', description: 'Advanced capability; guides others through significant complexity or ambiguity.', order: 4 },
      { id: 'level-5', name: 'Level 5', shortLabel: 'L5', description: 'Recognised expert-level capability, shaping direction beyond the immediate team.', order: 5 }
    ];

    var domains = [
      {
        id: 'domain-leadership', name: 'Leadership', shortCode: 'LEAD', order: 1,
        description: 'Drive, influence, and technical/organisational leadership - distinct from formal people management.',
        colour: '#B45309',
        levelDescriptions: {
          'level-1': 'Shows drive, determination, and proactive behaviour in their own work.',
          'level-2': 'Keeps a customer focus and sees the bigger picture beyond their immediate task.',
          'level-3': 'Leads small-scale change and helps develop the people they work with.',
          'level-4': 'Engages and inspires others, setting roadmaps and measurable goals.',
          'level-5': 'Exercises organisational influence and external/industry leadership.'
        }
      },
      {
        id: 'domain-collaboration', name: 'Collaboration', shortCode: 'COLLAB', order: 2,
        description: 'Communication, openness, and working effectively with and across teams.',
        colour: '#0E7490',
        levelDescriptions: {
          'level-1': 'Communicates clearly and shares ideas within the immediate team.',
          'level-2': 'Works openly and effectively with distributed and cross-functional colleagues.',
          'level-3': 'Uses influence and contextual awareness to align people outside the immediate team.',
          'level-4': 'Builds horizontal alliances and coordinates collaboration across multiple teams.',
          'level-5': 'Evangelises practices and collaboration models across the organisation or industry.'
        }
      },
      {
        id: 'domain-architecture', name: 'Architecture', shortCode: 'ARCH', order: 3,
        description: 'Structuring systems, from interfaces up to enterprise and organisation architecture.',
        colour: '#6D28D9',
        levelDescriptions: {
          'level-1': 'Understands and uses well-defined interfaces between components.',
          'level-2': 'Structures modules and code for a single system so responsibilities are clear.',
          'level-3': 'Designs system-level architecture and communicates trade-offs to stakeholders.',
          'level-4': 'Designs cross-system and enterprise architecture, integrating multiple domains.',
          'level-5': 'Shapes organisation-wide architecture strategy and standards.'
        }
      },
      {
        id: 'domain-security', name: 'Security', shortCode: 'SEC', order: 4,
        description: 'Secure coding, threat awareness, and security leadership.',
        colour: '#B91C1C',
        levelDescriptions: {
          'level-1': 'Aware of secure coding basics and common vulnerability classes.',
          'level-2': 'Performs basic threat modelling and manages known vulnerabilities.',
          'level-3': 'Designs secure architecture and leads incident response for their area.',
          'level-4': 'Acts as a security champion, raising practice across multiple teams.',
          'level-5': 'Sets security strategy and risk posture across the organisation.'
        }
      },
      {
        id: 'domain-devops', name: 'DevOps', shortCode: 'DEVOPS', order: 5,
        description: 'Delivery pipelines, infrastructure as code, observability, and platform engineering.',
        colour: '#15803D',
        levelDescriptions: {
          'level-1': 'Uses command-line tooling and an existing continuous integration pipeline.',
          'level-2': 'Builds continuous delivery pipelines and manages infrastructure as code.',
          'level-3': 'Implements observability and monitoring across services.',
          'level-4': 'Improves reliability and platform engineering across multiple teams.',
          'level-5': 'Sets DevOps strategy and tooling direction across the organisation.'
        }
      },
      {
        id: 'domain-testing', name: 'Testing', shortCode: 'TEST', order: 6,
        description: 'Test design, automation, strategy, and quality leadership.',
        colour: '#C2410C',
        levelDescriptions: {
          'level-1': 'Executes manual tests and designs basic test cases.',
          'level-2': 'Builds and maintains automated test suites.',
          'level-3': 'Defines test strategy and performs performance testing.',
          'level-4': 'Coaches quality practices and leads testing across a programme.',
          'level-5': 'Sets quality strategy across the organisation.'
        }
      },
      {
        id: 'domain-coding', name: 'Coding Practices', shortCode: 'CODE', order: 7,
        description: 'Software construction, code quality, and coding craft.',
        colour: '#1D4ED8',
        levelDescriptions: {
          'level-1': 'Writes basic, working code with guidance; learning core language features.',
          'level-2': 'Writes clean, idiomatic code independently for well-defined tasks.',
          'level-3': 'Designs reusable, well-tested code and actively manages technical debt.',
          'level-4': 'Mentors others on coding practice and improves team-wide code quality.',
          'level-5': 'Shapes coding standards and practice across the wider engineering organisation.'
        }
      }
    ];

    var capabilities = [
      // ---- Leadership ----
      capability('cap-drive', 'domain-leadership', 'DRIVE', 'Drive and Determination', 'Persistence and energy in completing their own work.', 1, 'milestone',
        [def('level-1', 'Shows persistence and energy in completing their own work.')]),
      capability('cap-proact', 'domain-leadership', 'PROACT', 'Proactive Behaviour', 'Identifies and acts on opportunities without being asked.', 2, 'milestone',
        [def('level-1', 'Identifies and acts on opportunities without being asked.')]),
      capability('cap-custfoc', 'domain-leadership', 'CUSTFOC', 'Customer Focus', 'Considers customer/user impact in day-to-day decisions.', 3, 'milestone',
        [def('level-2', 'Considers customer/user impact when making day-to-day decisions.')]),
      capability('cap-bigpic', 'domain-leadership', 'BIGPIC', 'Bigger Picture', 'Understands how their work connects to team and product goals.', 4, 'milestone',
        [def('level-2', 'Understands how their work connects to team and product goals.')]),
      capability('cap-leadch', 'domain-leadership', 'LEADCH', 'Lead Change', 'Leads change of increasing scope.', 5, 'progressive',
        [def('level-3', 'Leads small-scale change within a team.'), def('level-4', 'Leads change across multiple teams or a wider group.'), def('level-5', 'Leads organisation-wide change initiatives.')]),
      capability('cap-devppl', 'domain-leadership', 'DEVPPL', 'Develop People', 'Mentors and grows colleagues, independent of formal management authority.', 6, 'milestone',
        [def('level-3', "Mentors and grows colleagues' skills, without requiring formal management authority.")]),
      capability('cap-enginsp', 'domain-leadership', 'ENGINSP', 'Engage and Inspire', 'Engages and motivates people beyond their immediate team.', 7, 'milestone',
        [def('level-4', 'Engages and motivates people beyond their immediate team.')]),
      capability('cap-roadmap', 'domain-leadership', 'ROADMAP', 'Roadmap', 'Shapes roadmap and prioritisation for a product or platform area.', 8, 'milestone',
        [def('level-4', 'Shapes roadmap and prioritisation decisions for a product or platform area.')]),
      capability('cap-kpis', 'domain-leadership', 'KPIS', 'KPIs', 'Defines and tracks meaningful metrics for a team or initiative.', 9, 'milestone',
        [def('level-4', 'Defines and tracks meaningful metrics for a team or initiative.')]),
      capability('cap-orginfl', 'domain-leadership', 'ORGINFL', 'Organisational Influence', 'Influences direction and decisions across the wider organisation.', 10, 'milestone',
        [def('level-5', 'Influences direction and decisions across the wider organisation.')]),
      capability('cap-extlead', 'domain-leadership', 'EXTLEAD', 'External Leadership', 'Represents the organisation and shapes thinking in the wider industry.', 11, 'milestone',
        [def('level-5', 'Represents the organisation and shapes thinking in the wider industry.')]),

      // ---- Collaboration ----
      capability('cap-comm', 'domain-collaboration', 'COMM', 'Communication', 'Communicates clearly and respectfully with the immediate team.', 1, 'milestone',
        [def('level-1', 'Communicates clearly, concisely, and respectfully with the immediate team.')]),
      capability('cap-ideas', 'domain-collaboration', 'IDEAS', 'Ideas', 'Contributes ideas and constructive feedback in team discussions.', 2, 'milestone',
        [def('level-1', 'Contributes ideas and constructive feedback in team discussions.')]),
      capability('cap-open', 'domain-collaboration', 'OPEN', 'Openness', 'Open to feedback and differing viewpoints.', 3, 'milestone',
        [def('level-2', 'Is open to feedback and differing viewpoints, adjusting approach when appropriate.')]),
      capability('cap-distcol', 'domain-collaboration', 'DISTCOL', 'Distributed Collaboration', 'Collaborates effectively across locations and time zones.', 4, 'progressive',
        [def('level-2', 'Collaborates effectively with remote and cross-functional colleagues.'), def('level-3', 'Coordinates distributed work across multiple time zones and teams.')]),
      capability('cap-infl-collab', 'domain-collaboration', 'INFL', 'Influence', 'Builds informal influence with peers to align on shared approaches.', 5, 'milestone',
        [def('level-3', 'Builds informal influence with peers to align on shared approaches.')]),
      capability('cap-ctxint', 'domain-collaboration', 'CTXINT', 'Contextual Intelligence', 'Reads organisational context to collaborate effectively at scale.', 6, 'milestone',
        [def('level-4', 'Reads organisational and political context to collaborate effectively at scale.')]),
      capability('cap-horlead', 'domain-collaboration', 'HORLEAD', 'Horizontal Leadership', 'Leads and aligns work across teams without formal authority.', 7, 'milestone',
        [def('level-4', 'Leads and aligns work across teams without formal authority.')]),
      capability('cap-evang', 'domain-collaboration', 'EVANG', 'Evangelism', 'Promotes practices and ways of working across the organisation or industry.', 8, 'milestone',
        [def('level-5', 'Promotes practices and ways of working across the organisation or industry.')]),

      // ---- Architecture ----
      capability('cap-int', 'domain-architecture', 'INT', 'Interfaces', 'Understands and uses well-defined interfaces between components.', 1, 'milestone',
        [def('level-1', 'Understands and uses well-defined interfaces between components.')]),
      capability('cap-syscomm', 'domain-architecture', 'SYSCOMM', 'System Communicator', "Explains a system's components and how they fit together.", 2, 'milestone',
        [def('level-2', "Explains how a system's components fit together to teammates and stakeholders.")]),
      capability('cap-codestr', 'domain-architecture', 'CODESTR', 'Code Structure', 'Structures modules/packages so responsibilities are clear and cohesive.', 3, 'milestone',
        [def('level-2', 'Structures modules and packages so responsibilities are clear and cohesive.')]),
      capability('cap-sysarch', 'domain-architecture', 'SYSARCH', 'System Architecture', 'Designs architecture from a single system up to multiple systems.', 4, 'progressive',
        [def('level-3', 'Designs the architecture of a single system, balancing key quality attributes.'), def('level-4', 'Designs architecture spanning multiple systems and teams.')]),
      capability('cap-domcomm', 'domain-architecture', 'DOMCOMM', 'Domain Communicator', 'Communicates architectural trade-offs to technical and non-technical audiences.', 5, 'milestone',
        [def('level-3', 'Communicates architectural trade-offs clearly to both technical and non-technical audiences.')]),
      capability('cap-entarch', 'domain-architecture', 'ENTARCH', 'Enterprise Architecture', 'Designs architecture aligning multiple business domains and systems.', 6, 'milestone',
        [def('level-4', 'Designs architecture that aligns multiple business domains and systems.')]),
      capability('cap-archcomm', 'domain-architecture', 'ARCHCOMM', 'Architecture Communication', 'Produces architecture decision records and diagrams that scale across teams.', 7, 'milestone',
        [def('level-4', 'Produces architecture decision records and diagrams that scale across teams.')]),
      capability('cap-intarch', 'domain-architecture', 'INTARCH', 'Integration Architecture', 'Designs integration patterns across systems, teams, and external partners.', 8, 'milestone',
        [def('level-4', 'Designs integration patterns across systems, teams, and external partners.')]),
      capability('cap-orgarch', 'domain-architecture', 'ORGARCH', 'Organisation Architecture', 'Sets architectural direction and standards across the whole organisation.', 9, 'milestone',
        [def('level-5', 'Sets architectural direction and standards across the whole organisation.')]),

      // ---- Security ----
      capability('cap-secaw', 'domain-security', 'SECAW', 'Security Awareness', 'Understands common vulnerability classes and secure coding basics.', 1, 'milestone',
        [def('level-1', 'Understands common vulnerability classes and secure coding basics.')]),
      capability('cap-seccode', 'domain-security', 'SECCODE', 'Secure Coding Basics', 'Applies basic secure coding practices such as input validation.', 2, 'milestone',
        [def('level-1', 'Applies basic secure coding practices such as input validation.')]),
      capability('cap-threatmod', 'domain-security', 'THREATMOD', 'Threat Modelling', 'Performs basic threat modelling for a feature or component.', 3, 'milestone',
        [def('level-2', 'Performs basic threat modelling for a feature or component.')]),
      capability('cap-vulnmgmt', 'domain-security', 'VULNMGMT', 'Vulnerability Management', 'Triages and tracks remediation of known vulnerabilities.', 4, 'milestone',
        [def('level-2', 'Triages and tracks remediation of known vulnerabilities.')]),
      capability('cap-secarch', 'domain-security', 'SECARCH', 'Security Architecture', 'Designs secure architecture from a single system up to multiple systems.', 5, 'progressive',
        [def('level-3', 'Designs secure architecture for a single system.'), def('level-4', 'Designs secure architecture spanning multiple systems and teams.')]),
      capability('cap-incresp', 'domain-security', 'INCRESP', 'Incident Response', 'Leads incident response and remediation for their area.', 6, 'milestone',
        [def('level-3', 'Leads incident response and remediation for their area.')]),
      capability('cap-secchamp', 'domain-security', 'SECCHAMP', 'Security Champion', 'Raises security practice across multiple teams as a champion.', 7, 'milestone',
        [def('level-4', 'Raises security practice across multiple teams as a champion.')]),
      capability('cap-secstrat', 'domain-security', 'SECSTRAT', 'Security Strategy', 'Sets security strategy and risk posture across the organisation.', 8, 'milestone',
        [def('level-5', 'Sets security strategy and risk posture across the organisation.')]),

      // ---- DevOps ----
      capability('cap-clibash', 'domain-devops', 'CLIBASH', 'Command Line and Scripting Basics', 'Uses shell/command-line tooling and basic scripting for everyday tasks.', 1, 'milestone',
        [def('level-1', 'Uses shell/command-line tooling and basic scripting for everyday tasks.')]),
      capability('cap-cibasics', 'domain-devops', 'CIBASICS', 'Continuous Integration Basics', 'Uses an existing CI pipeline to build and test changes.', 2, 'milestone',
        [def('level-1', 'Uses an existing continuous integration pipeline to build and test changes.')]),
      capability('cap-cd', 'domain-devops', 'CD', 'Continuous Delivery', 'Configures and maintains deployment pipelines for a service.', 3, 'milestone',
        [def('level-2', 'Configures and maintains deployment pipelines for a service.')]),
      capability('cap-iac', 'domain-devops', 'IAC', 'Infrastructure as Code', 'Writes and sets standards for infrastructure as code.', 4, 'progressive',
        [def('level-2', 'Writes and maintains infrastructure-as-code for a single service.'), def('level-3', 'Designs reusable infrastructure-as-code modules for multiple services.'), def('level-4', 'Sets infrastructure-as-code standards across multiple teams.')]),
      capability('cap-observ', 'domain-devops', 'OBSERV', 'Observability and Monitoring', 'Implements logging, metrics, and alerting for services they own.', 5, 'milestone',
        [def('level-3', 'Implements logging, metrics, and alerting for services they own.')]),
      capability('cap-releng', 'domain-devops', 'RELENG', 'Reliability Engineering', 'Improves reliability and incident readiness across multiple services.', 6, 'milestone',
        [def('level-4', 'Improves reliability and incident readiness across multiple services.')]),
      capability('cap-plateng', 'domain-devops', 'PLATENG', 'Platform Engineering', 'Builds internal platforms and tooling used by multiple teams.', 7, 'milestone',
        [def('level-4', 'Builds internal platforms and tooling used by multiple teams.')]),
      capability('cap-devopsstrat', 'domain-devops', 'DEVOPSSTRAT', 'DevOps Strategy', 'Sets DevOps tooling and delivery strategy across the organisation.', 8, 'milestone',
        [def('level-5', 'Sets DevOps tooling and delivery strategy across the organisation.')]),

      // ---- Testing ----
      capability('cap-mantest', 'domain-testing', 'MANTEST', 'Manual Testing Fundamentals', 'Executes manual test scripts and reports defects clearly.', 1, 'milestone',
        [def('level-1', 'Executes manual test scripts and reports defects clearly.')]),
      capability('cap-testcase', 'domain-testing', 'TESTCASE', 'Test Case Design', 'Designs basic test cases from requirements or acceptance criteria.', 2, 'milestone',
        [def('level-1', 'Designs basic test cases from requirements or acceptance criteria.')]),
      capability('cap-autotest', 'domain-testing', 'AUTOTEST', 'Test Automation', 'Writes and sets standards for automated testing.', 3, 'progressive',
        [def('level-2', 'Writes and maintains automated tests for a single component.'), def('level-3', 'Designs automated test frameworks used across a service.'), def('level-4', 'Sets automated testing standards and tooling across multiple teams.')]),
      capability('cap-teststrat', 'domain-testing', 'TESTSTRAT', 'Test Strategy', 'Defines the test strategy for a feature or service.', 4, 'milestone',
        [def('level-3', 'Defines the test strategy for a feature or service.')]),
      capability('cap-perftest', 'domain-testing', 'PERFTEST', 'Performance Testing', 'Designs and runs performance/load tests for a service.', 5, 'milestone',
        [def('level-3', 'Designs and runs performance/load tests for a service.')]),
      capability('cap-qualcoach', 'domain-testing', 'QUALCOACH', 'Quality Coaching', 'Coaches other engineers and testers on quality practices.', 6, 'milestone',
        [def('level-4', 'Coaches other engineers and testers on quality practices.')]),
      capability('cap-testlead', 'domain-testing', 'TESTLEAD', 'Test Leadership', 'Leads testing efforts across a programme of work.', 7, 'milestone',
        [def('level-4', 'Leads testing efforts across a programme of work.')]),
      capability('cap-qualstrat', 'domain-testing', 'QUALSTRAT', 'Quality Strategy', 'Sets quality strategy and standards across the organisation.', 8, 'milestone',
        [def('level-5', 'Sets quality strategy and standards across the organisation.')]),

      // ---- Coding Practices ----
      capability('cap-bl1', 'domain-coding', 'BL1', 'Basic Language Foundations', 'Basic foundational knowledge of the chosen language.', 1, 'milestone',
        [def('level-1', 'Writes basic working code in the primary language with guidance.')]),
      capability('cap-csf', 'domain-coding', 'CSF', 'Computer Science Fundamentals', 'Basic data structures, algorithms, and complexity trade-offs.', 2, 'milestone',
        [def('level-1', 'Understands basic data structures, algorithms, and complexity trade-offs.')]),
      capability('cap-scm', 'domain-coding', 'SCM', 'Source Control', 'Uses version control for day-to-day change management.', 3, 'milestone',
        [def('level-1', 'Uses version control for day-to-day change management, including branches and pull requests.')]),
      capability('cap-ilf', 'domain-coding', 'ILF', 'Intermediate Language Foundations', 'Applies intermediate language features and idioms independently.', 4, 'milestone',
        [def('level-2', 'Applies intermediate language features and idioms independently.')]),
      capability('cap-cq', 'domain-coding', 'CQ', 'Code Quality', 'Readable, well-tested code through to team-wide standards.', 5, 'progressive',
        [def('level-2', 'Writes readable code that follows team style and review conventions.'), def('level-3', 'Actively improves readability, naming, and test coverage across a codebase.'), def('level-4', 'Defines and enforces code quality standards for a whole team or service.')]),
      capability('cap-rec', 'domain-coding', 'REC', 'Reusable and Extensible Code', 'Designs components/libraries reused safely across multiple call sites.', 6, 'milestone',
        [def('level-3', 'Designs components and libraries that are reused safely across multiple call sites.')]),
      capability('cap-td', 'domain-coding', 'TD', 'Tech Debt', 'Identifies, communicates, and plans remediation of technical debt.', 7, 'milestone',
        [def('level-3', 'Identifies, communicates, and plans remediation of technical debt.')]),
      capability('cap-cm', 'domain-coding', 'CM', 'Coding Mentor', 'Actively mentors other engineers on coding practice and craft.', 8, 'milestone',
        [def('level-4', 'Actively mentors other engineers on coding practice and craft.')]),
      capability('cap-ind', 'domain-coding', 'IND', 'Industry Influence', 'Shapes coding practice and standards beyond the organisation.', 9, 'milestone',
        [def('level-5', "Shapes coding practice and standards beyond the organisation, e.g. through publications or open source.")])
    ];

    var roleFamilies = [
      {
        id: 'role-family-software-engineering', name: 'Software Engineering', order: 1,
        description: 'Individual contributor software engineering career path.', colour: '#2563EB',
        careerStages: [
          { id: 'stage-graduate', title: 'Graduate Software Engineer', shortTitle: 'Graduate', description: 'Entry-level engineer building foundational skills.', order: 1 },
          { id: 'stage-engineer', title: 'Software Engineer', shortTitle: 'Engineer', description: 'Delivers independently on well-scoped work.', order: 2 },
          { id: 'stage-senior', title: 'Senior Software Engineer', shortTitle: 'Senior', description: 'Owns significant components and mentors others.', order: 3 },
          { id: 'stage-staff', title: 'Staff Engineer', shortTitle: 'Staff', description: 'Drives technical direction across multiple teams.', order: 4 },
          { id: 'stage-principal', title: 'Principal Engineer', shortTitle: 'Principal', description: 'Sets technical strategy and influence across the organisation.', order: 5 }
        ]
      },
      {
        id: 'role-family-test-engineering', name: 'Test Engineering', order: 2,
        description: 'Individual contributor test engineering career path, reusing the same capability framework.', colour: '#0D9488',
        careerStages: [
          { id: 'stage-test-engineer', title: 'Test Engineer', shortTitle: 'Test Engineer', description: '', order: 1 },
          { id: 'stage-senior-test-engineer', title: 'Senior Test Engineer', shortTitle: 'Senior', description: '', order: 2 },
          { id: 'stage-principal-test-engineer', title: 'Principal Test Engineer', shortTitle: 'Principal', description: '', order: 3 }
        ]
      },
      {
        id: 'role-family-business-analysis', name: 'Business Analysis', order: 3,
        description: 'Business analysis career path, demonstrating the framework beyond engineering.', colour: '#9333EA',
        careerStages: [
          { id: 'stage-business-analyst', title: 'Business Analyst', shortTitle: 'BA', description: '', order: 1 },
          { id: 'stage-senior-business-analyst', title: 'Senior Business Analyst', shortTitle: 'Senior BA', description: '', order: 2 },
          { id: 'stage-lead-business-analyst', title: 'Lead Business Analyst', shortTitle: 'Lead BA', description: '', order: 3 }
        ]
      }
    ];

    var roleProfiles = [
      {
        id: 'profile-graduate', roleFamilyId: 'role-family-software-engineering', careerStageId: 'stage-graduate',
        domainTargets: {
          'domain-leadership': 'level-1', 'domain-collaboration': 'level-1', 'domain-architecture': 'level-1',
          'domain-security': 'level-1', 'domain-devops': 'level-1', 'domain-testing': 'level-1', 'domain-coding': 'level-1'
        },
        capabilityOverrides: {}
      },
      {
        id: 'profile-engineer', roleFamilyId: 'role-family-software-engineering', careerStageId: 'stage-engineer',
        domainTargets: {
          'domain-leadership': 'level-1', 'domain-collaboration': 'level-2', 'domain-architecture': 'level-2',
          'domain-security': 'level-1', 'domain-devops': 'level-2', 'domain-testing': 'level-2', 'domain-coding': 'level-2'
        },
        capabilityOverrides: {}
      },
      {
        id: 'profile-senior', roleFamilyId: 'role-family-software-engineering', careerStageId: 'stage-senior',
        domainTargets: {
          'domain-leadership': 'level-2', 'domain-collaboration': 'level-3', 'domain-architecture': 'level-3',
          'domain-security': 'level-2', 'domain-devops': 'level-3', 'domain-testing': 'level-3', 'domain-coding': 'level-3'
        },
        capabilityOverrides: {
          'cap-threatmod': { status: 'excluded', targetLevelId: null, notes: 'Not expected until Staff Engineer in this demonstration ladder.' }
        }
      },
      {
        id: 'profile-staff', roleFamilyId: 'role-family-software-engineering', careerStageId: 'stage-staff',
        domainTargets: {
          'domain-leadership': 'level-3', 'domain-collaboration': 'level-4', 'domain-architecture': 'level-4',
          'domain-security': 'level-3', 'domain-devops': 'level-4', 'domain-testing': 'level-4', 'domain-coding': 'level-4'
        },
        capabilityOverrides: {
          'cap-enginsp': { status: 'required', targetLevelId: 'level-4', notes: 'Staff engineers are expected to inspire beyond their immediate team even though the Leadership domain target is still Level 3 at this stage.' }
        }
      },
      {
        id: 'profile-principal', roleFamilyId: 'role-family-software-engineering', careerStageId: 'stage-principal',
        domainTargets: {
          'domain-leadership': 'level-4', 'domain-collaboration': 'level-5', 'domain-architecture': 'level-5',
          'domain-security': 'level-4', 'domain-devops': 'level-4', 'domain-testing': 'level-3', 'domain-coding': 'level-5'
        },
        capabilityOverrides: {
          'cap-extlead': { status: 'required', targetLevelId: 'level-5', notes: 'Explicitly required for Principal Engineers as a technical-influence capability, independent of formal people management.' }
        }
      },
      {
        id: 'profile-test-engineer', roleFamilyId: 'role-family-test-engineering', careerStageId: 'stage-test-engineer',
        domainTargets: {
          'domain-leadership': 'level-1', 'domain-collaboration': 'level-1', 'domain-architecture': 'level-1',
          'domain-security': 'level-1', 'domain-devops': 'level-1', 'domain-testing': 'level-2', 'domain-coding': 'level-1'
        },
        capabilityOverrides: {}
      },
      {
        id: 'profile-senior-test-engineer', roleFamilyId: 'role-family-test-engineering', careerStageId: 'stage-senior-test-engineer',
        domainTargets: {
          'domain-leadership': 'level-2', 'domain-collaboration': 'level-2', 'domain-architecture': 'level-2',
          'domain-security': 'level-2', 'domain-devops': 'level-2', 'domain-testing': 'level-4', 'domain-coding': 'level-2'
        },
        capabilityOverrides: {}
      },
      {
        id: 'profile-principal-test-engineer', roleFamilyId: 'role-family-test-engineering', careerStageId: 'stage-principal-test-engineer',
        domainTargets: {
          'domain-leadership': 'level-3', 'domain-collaboration': 'level-3', 'domain-architecture': 'level-3',
          'domain-security': 'level-3', 'domain-devops': 'level-3', 'domain-testing': 'level-5', 'domain-coding': 'level-3'
        },
        capabilityOverrides: {}
      },
      {
        id: 'profile-business-analyst', roleFamilyId: 'role-family-business-analysis', careerStageId: 'stage-business-analyst',
        domainTargets: {
          'domain-leadership': 'level-1', 'domain-collaboration': 'level-2', 'domain-architecture': 'level-1',
          'domain-security': 'level-1', 'domain-testing': 'level-1'
        },
        capabilityOverrides: {}
      },
      {
        id: 'profile-senior-business-analyst', roleFamilyId: 'role-family-business-analysis', careerStageId: 'stage-senior-business-analyst',
        domainTargets: {
          'domain-leadership': 'level-2', 'domain-collaboration': 'level-3', 'domain-architecture': 'level-2',
          'domain-security': 'level-1', 'domain-testing': 'level-2'
        },
        capabilityOverrides: {}
      },
      {
        id: 'profile-lead-business-analyst', roleFamilyId: 'role-family-business-analysis', careerStageId: 'stage-lead-business-analyst',
        domainTargets: {
          'domain-leadership': 'level-3', 'domain-collaboration': 'level-4', 'domain-architecture': 'level-2',
          'domain-security': 'level-2', 'domain-testing': 'level-2'
        },
        capabilityOverrides: {}
      }
    ];

    var referenceFrameworks = [
      {
        id: 'ref-sfia-9', name: 'SFIA', type: 'sfia', version: 'SFIA 9',
        description: 'Skills Framework for the Information Age. Mapping fields only; the full SFIA framework is not embedded (licensed content).',
        sourceUrl: 'https://sfia-online.org/en/sfia-9/responsibilities',
        levels: [
          { order: 1, label: 'Follow' }, { order: 2, label: 'Assist' }, { order: 3, label: 'Apply' },
          { order: 4, label: 'Enable' }, { order: 5, label: 'Ensure, advise' }, { order: 6, label: 'Initiate, influence' },
          { order: 7, label: 'Set strategy, inspire, mobilise' }
        ],
        areas: []
      },
      {
        id: 'ref-ecf', name: 'e-CF', type: 'ecf', version: 'EN 16234-1:2019 / e-CF',
        description: 'European e-Competence Framework. Mapping fields and basic reference metadata only; the full catalogue is not embedded.',
        sourceUrl: 'https://ecfexplorer.itprofessionalism.org/',
        levels: [
          { order: 1, label: 'e-1' }, { order: 2, label: 'e-2' }, { order: 3, label: 'e-3' },
          { order: 4, label: 'e-4' }, { order: 5, label: 'e-5' }
        ],
        areas: ['Plan', 'Build', 'Run', 'Enable', 'Manage']
      },
      {
        id: 'ref-custom-legacy', name: 'Legacy Spreadsheet Codes', type: 'custom', version: '2022 workbook',
        description: 'Example custom reference framework, e.g. codes carried over from a previous spreadsheet-based scheme.',
        sourceUrl: '',
        levels: [{ order: 1, label: 'Tier 1' }, { order: 2, label: 'Tier 2' }, { order: 3, label: 'Tier 3' }],
        areas: []
      }
    ];

    var mappings = [
      {
        id: 'mapping-1', sourceType: 'capability', sourceId: 'cap-sysarch', referenceFrameworkId: 'ref-sfia-9',
        referenceCode: 'ARCH', referenceTitle: 'Solution architecture', referenceLevel: '5',
        relationship: 'closely-related', confidence: 'medium',
        notes: 'User-defined crosswalk for demonstration purposes only - not an official equivalence.', sourceUrl: ''
      },
      {
        id: 'mapping-2', sourceType: 'capability', sourceId: 'cap-autotest', referenceFrameworkId: 'ref-sfia-9',
        referenceCode: 'TEST', referenceTitle: 'Testing', referenceLevel: '4',
        relationship: 'supports', confidence: 'medium', notes: 'Illustrative mapping only.', sourceUrl: ''
      },
      {
        id: 'mapping-3', sourceType: 'capability', sourceId: 'cap-secarch', referenceFrameworkId: 'ref-sfia-9',
        referenceCode: 'SCTY', referenceTitle: 'Information security', referenceLevel: '5',
        relationship: 'supports', confidence: 'low', notes: 'Partial overlap only; confirm before relying on this crosswalk.', sourceUrl: ''
      },
      {
        id: 'mapping-4', sourceType: 'capability', sourceId: 'cap-devppl', referenceFrameworkId: 'ref-ecf',
        referenceCode: 'D.9', referenceTitle: 'Personnel Development Management', referenceLevel: 'e-4',
        relationship: 'closely-related', confidence: 'medium', notes: 'e-CF area: Enable.', sourceUrl: ''
      },
      {
        id: 'mapping-5', sourceType: 'capability', sourceId: 'cap-iac', referenceFrameworkId: 'ref-ecf',
        referenceCode: 'B.2', referenceTitle: 'Component Integration', referenceLevel: 'e-3',
        relationship: 'partial-overlap', confidence: 'low', notes: 'e-CF area: Build.', sourceUrl: ''
      },
      {
        id: 'mapping-6', sourceType: 'capability', sourceId: 'cap-bl1', referenceFrameworkId: 'ref-custom-legacy',
        referenceCode: 'T1-COD', referenceTitle: 'Coding Tier 1', referenceLevel: 'Tier 1',
        relationship: 'equivalent', confidence: 'high', notes: 'Directly ported from the legacy spreadsheet tier system.', sourceUrl: ''
      }
    ];

    return {
      schemaVersion: 1,
      meta: {
        frameworkName: 'Engineering Capability Framework',
        description: 'Demonstration role and capability framework proof of concept. Values shown are illustrative, not a universal career standard.',
        createdAt: nowIso,
        updatedAt: nowIso
      },
      levels: levels,
      domains: domains,
      capabilities: capabilities,
      roleFamilies: roleFamilies,
      roleProfiles: roleProfiles,
      referenceFrameworks: referenceFrameworks,
      mappings: mappings
    };
  }

  global.RCF = global.RCF || {};
  global.RCF.data = global.RCF.data || {};
  global.RCF.data.buildDemoState = buildDemoState;
})(window);
