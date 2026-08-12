# Capability Manager

Capability Manager is a browser-based, single-page application for designing and maintaining a role and capability matrix. It brings an organisation's own capability model together with optional references to [SFIA](https://sfia-online.org/en/sfia-9/responsibilities), the [European e-Competence Framework (e-CF)](https://itprofessionalism.org/professionalism/e-competence-framework/), or another custom framework.

The application is a proof of concept rather than an employee assessment or enterprise HR system. It runs entirely in the browser, works offline, and stores its data locally.

## What is a capability matrix?

A capability matrix describes the skills, behaviours, competencies, and activities an organisation needs, along with the maturity expected for different roles. It helps answer questions such as:

- What does good performance look like in Architecture, Security, Testing, or Leadership at each maturity level?
- How do the expectations for a Software Engineer differ from those for a Senior or Principal Engineer?
- Which capabilities are shared by Software Engineering, Test Engineering, and Business Analysis?
- Where does an internal capability relate to an external professional framework?

This project separates three concepts that are often mixed together:

| Concept | Purpose |
| --- | --- |
| Proficiency level | Describes increasing maturity in a capability or domain. |
| Career stage | Represents an organisational role or title in a career path. |
| External mapping | Records a user-defined relationship to SFIA, e-CF, or another reference. |

A career stage is not automatically a proficiency level. For example, a Principal Engineer can require different maturity in Coding, Architecture, Collaboration, and Leadership. Technical progression also does not require people management; technical and management career paths can coexist as separate role families.

## SFIA and e-CF

### SFIA

SFIA (Skills Framework for the Information Age) provides a common language for describing digital skills and professional responsibility. The application supports SFIA as an external mapping target, including a version, skill code and title, one of the seven responsibility levels, a relationship type, confidence, notes, and an optional source URL.

The complete SFIA catalogue is not bundled. SFIA content is licensed intellectual property, so organisations should confirm the appropriate licence before embedding or redistributing substantial SFIA material. See the [SFIA licensing guidance](https://sfia-online.org/en/about-sfia/licensing-sfia/using-and-licensing-sfia).

### European e-Competence Framework

The European e-Competence Framework provides a shared reference for ICT competences. It uses proficiency levels e-1 through e-5 and groups competences into the areas Plan, Build, Run, Enable, and Manage. Capability Manager can record an e-CF code, title, proficiency level, area, relationship, confidence, notes, and source URL.

As with SFIA, the application stores reference metadata and user-entered mappings rather than reproducing the full framework catalogue.

### Mappings are explicit crosswalks

Capability Manager does not claim that an internal level is automatically equivalent to a SFIA or e-CF level. Every mapping is created by a user and can be described as equivalent, closely related, supporting, or partially overlapping, with an associated confidence and explanation.

## How the application helps

- **Dashboard:** Summarises the framework and displays a role capability radar and career-progression heatmap.
- **Framework Builder:** Creates and orders internal maturity levels, domains, domain-level descriptions, and capabilities.
- **Capability definitions:** Supports milestone capabilities at one level and progressive capabilities with distinct statements at several levels.
- **Capability Map:** Presents capabilities in maturity bands, with search and filters for domain, level, mode, and mapping status.
- **Role design:** Builds multiple role families and independent career ladders, then assigns a target maturity for every domain and career stage.
- **Fine-grained profiles:** Adds required, optional, or excluded capability overrides when a domain-level target is too broad.
- **Role overlays:** Projects a selected career stage onto the Capability Map so its expected capabilities can be inspected visually.
- **External references:** Manages SFIA, e-CF, and custom reference frameworks and maps capabilities, domains, or career stages to them.
- **Local data management:** Autosaves to browser `localStorage`, validates JSON imports, exports the complete framework, and can restore the demonstration data.

The included demo illustrates five neutral maturity levels, domains such as Leadership, Collaboration, Architecture, Security, DevOps, Testing, and Coding Practices, and example role families for Software Engineering, Test Engineering, and Business Analysis. Its values are examples only, not a universal career standard.

## Getting started

No installation, backend, package manager, or internet connection is required.

1. Download or clone the repository.
2. Open [`dist/index.html`](dist/index.html) in a current desktop browser.
3. Use **Framework Builder** to adapt the levels, domains, and capabilities.
4. Use **Roles** to define career paths and capability expectations.
5. Export the framework as JSON to create a portable backup.

Chrome, Edge, Firefox, and Safari are the intended browsers.

> Browser storage belongs to the current browser profile and local file origin. Export important work before clearing browser data or moving to another device.

## Development

The maintainable source is in `src/` and uses HTML5, CSS3, and vanilla JavaScript. It has no runtime dependencies, CDN assets, network calls, database, or application framework.

### Project structure

```text
src/
  index.html               Source entry point
  css/                     Application and component styles
  js/
    app.js                 Application bootstrap
    core/                  Store, routing, validation, and persistence
    components/            Editors, navigation, maps, charts, and dialogs
    data/demoData.js        Replaceable demonstration framework
    utils/                 DOM, ID, calculation, and import/export helpers
```

State changes pass through a central store. Views are implemented as small browser-native components, hash routing switches views without page reloads, and the charts use native SVG or semantic HTML rather than third-party chart libraries.

## Scope and data considerations

This proof of concept does not include user accounts, authentication, cloud synchronisation, real-time collaboration, employee records, performance reviews, recruitment workflows, HR system integration, or authoritative SFIA/e-CF datasets. All information remains on the local device unless it is explicitly exported by the user.

## Licence

The project source is available under the terms in [LICENSE](LICENSE). External frameworks and their content remain subject to their respective owners' licensing terms.
