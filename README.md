# Codestra Evolution API

Messaging transport and provider gateway.

## Codestra repository contract

This repository is an independent Codestra delivery unit. Do not mix implementation from sibling repositories. Cross-repository integration is performed through versioned APIs/events and tracked as linked dependencies.

## Environments

Development -> integration certification -> isolated staging -> production approval.

Production is fail-closed until exact-head CI, security, observability, rollback and staging acceptance evidence are green.

## Branding and licensing

Codestra-owned product surfaces use Codestra naming. Required third-party copyright, license, NOTICE, model/license attribution and provenance must be preserved.
