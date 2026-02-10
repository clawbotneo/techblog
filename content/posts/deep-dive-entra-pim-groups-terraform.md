---
title: "Entra ID PIM for Groups with Terraform (azuread): a practical pattern"
date: 2026-02-05T19:35:00+01:00
draft: false
tags: ["entra", "pim", "terraform", "azuread", "iam", "governance", "security"]
categories: ["deep-dive"]
summary: "A practical, operator-friendly pattern to manage PIM-eligible group membership with Terraform (azuread only) and group-based approvals."
---

You can be “least privilege” on paper and still end up with too many **permanent** role assignments in practice.

**PIM for Groups** is one of the best ways I’ve found to keep access **just-in-time**, while still being usable for engineers. In this post I’ll share a pragmatic pattern to roll it out with **Terraform (azuread provider only)**, with **approvals handled by a group**.

> Transparency: This post focuses on a pattern I’ve seen work. AzureAD provider support for PIM features has improved, but APIs and provider behavior can change. Test in a non-prod tenant and pin provider versions.

## What we’re trying to achieve

- Engineers are **not** permanent members of privileged groups.
- Membership becomes **eligible** and is activated only when needed.
- Activations are auditable and time-bound.
- Approvals are **group-based** (no single-person bottleneck).
- Group ownership and break-glass flows are explicit.

## Architecture (mental model)

1) A **role-assignable Entra security group** represents a privilege bundle (e.g. `ENTRA-Intune-Administrators`).
2) That group is assigned one or more **Entra ID directory roles** (for example **Intune Administrator**).
3) Users become **eligible** for group membership via **PIM for Groups**.
4) When needed, a user activates membership for a limited time.
5) An **approver group** approves the activation.

## Naming convention (what I use)

Keep names boring and searchable:

- Privileged group: `ENTRA-<Workload>-<Role>`
  - example: `ENTRA-Intune-Administrators`
- Approver group: `ENTRA-<Workload>-<Role>-Approvers`
  - example: `ENTRA-Intune-Administrators-Approvers`

A simple rule: **every privileged group must have an approver group**, and it must not be empty.

## Terraform: minimal working example (azuread only)

Below is a *working skeleton* you can adapt. The idea is:

- Create the groups
- Enable/define the group as a **privileged access group** (PIM)
- Create **eligible** assignments for members
- Configure approval requirements (approver group)

### 1) Providers and version pinning

```hcl
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azuread = {
      source  = "hashicorp/azuread"
      # Pin this in your repo; PIM resources have had breaking changes historically.
      version = "~> 3.0"
    }
  }
}

provider "azuread" {
  # uses current az login / env-based auth
}
```

### 2) Create a *role-assignable* privileged group + approver group

For Entra directory roles, you typically want a **role-assignable group**.

```hcl
resource "azuread_group" "privileged" {
  display_name     = "ENTRA-Intune-Administrators"
  security_enabled = true
  mail_enabled     = false

  # critical for Entra ID directory role assignments
  assignable_to_role = true

  description = "Privileged group. Membership is controlled via PIM for Groups (eligible by default)."
}

resource "azuread_group" "approvers" {
  display_name     = "ENTRA-Intune-Administrators-Approvers"
  security_enabled = true
  mail_enabled     = false
  description      = "Approvers for PIM activations for ENTRA-Intune-Administrators."
}
```

### 3) Turn the group into a PIM-enabled privileged access group

> The azuread provider has multiple PIM-related resources (naming varies by version). In recent provider versions you’ll typically use `azuread_privileged_access_group` and then schedules for eligibility/assignment.

```hcl
resource "azuread_privileged_access_group" "this" {
  group_id = azuread_group.privileged.object_id

  # The exact attribute names can differ across provider versions.
  # The intent is:
  # - activation requires approval
  # - approvers are a group (not individuals)
  # - activation is time-bound

  # Example-style configuration (adjust to provider docs/version):
  approval_required = true
  approver_ids      = [azuread_group.approvers.object_id]

  # Optional but recommended guardrails:
  max_activation_duration = "PT8H" # 8 hours
  require_justification   = true
}
```

If your provider version doesn’t support some of these fields yet: keep the privileged access group resource, and configure activation settings in the portal once, then let Terraform handle membership eligibility schedules.

### 4) Make users eligible (not permanent) via eligibility schedules

```hcl
variable "eligible_member_object_ids" {
  type        = set(string)
  description = "Object IDs of users who are eligible to activate membership."
}

resource "azuread_privileged_access_group_eligibility_schedule" "eligible" {
  for_each = var.eligible_member_object_ids

  group_id        = azuread_group.privileged.object_id
  principal_id    = each.value
  assignment_type = "member"

  # Keep it simple: permanent eligibility (activation is still time-bound)
  permanent_assignment = true

  justification = "Eligible membership via Terraform"
}
```

## The operational runbook (this is where trust comes from)

Here’s the workflow that keeps this from turning into “PIM theatre”:

1) Engineer requests activation
2) Adds justification (ideally: ticket/incident link)
3) Approval comes from the **approver group**
4) Activation expires automatically (e.g. 1–4 hours)
5) Weekly: review activations + prune eligibility

## Guardrails I strongly recommend

- **Ban direct user directory role assignments** (detect and clean up; don’t rely on good intentions).
- Keep activation windows reasonable: **8 hours** can be OK for day work, but don’t let it become “always on”.
- Require justification. “Need access” is not justification.
- Decide break-glass explicitly: separate accounts, separate groups, monitored.

## Common gotchas

- **Approver group ownership** is unclear → approvals stall.
- Too many eligible users → “eligible” becomes the new “permanent”.
- People bypass with direct role assignments “just for now” → drift returns.
- Forgetting `assignable_to_role = true` → you can’t assign directory roles to the group.

## Next steps (if you want to productionize this)

If you want to take this from “pattern” to “org standard”, here’s what I recommend doing next:

- **Module it**: wrap group creation + PIM configuration + eligibility schedules in a small Terraform module per role bundle.
- **Add drift detection**: alert on direct directory role assignments and unexpected permanent privileged memberships.
- **Define a review cadence**: monthly eligibility review + quarterly role bundle review.
- **Write the runbook**: a one-pager for engineers (“how to request/activate”) and approvers (“what to look for”).

I’ll likely follow this up with a concrete repo/module layout + CI/CD pattern, because that’s where most teams lose the thread.
