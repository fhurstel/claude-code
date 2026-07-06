#!/usr/bin/env python3
"""
UpFirst Lead Scanner for ProField
Scans Gmail for new UpFirst call notifications and logs them as leads.
Run via cron: */15 * * * * /usr/bin/python3 /root/.hermes/workspace/profield/scripts/scan-upfirst-leads.py
"""

import os
import re
import json
import subprocess
from datetime import datetime

LEADS_FILE = '/root/.hermes/workspace/profield/data/upfirst_leads.json'
LOG_FILE = '/root/.hermes/workspace/profield/data/upfirst_scan.log'

def log(msg):
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG_FILE, 'a') as f:
        f.write(line + '\n')

def load_existing_leads():
    if os.path.exists(LEADS_FILE):
        with open(LEADS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_leads(leads):
    os.makedirs(os.path.dirname(LEADS_FILE), exist_ok=True)
    with open(LEADS_FILE, 'w') as f:
        json.dump(leads, f, indent=2)

def scan_gmail_for_upfirst():
    """Use gmail CLI or API to find UpFirst emails"""
    # For now, we'll use the Zapier MCP via a simple approach
    # In production, this would use the Gmail API directly
    log("Scanning Gmail for UpFirst leads...")
    
    # Placeholder - actual implementation would call Gmail API
    # or use the hermes gmail tool
    new_leads = []
    return new_leads

def main():
    log("=== UpFirst Lead Scan Started ===")
    
    existing = load_existing_leads()
    existing_phones = {l.get('phone', '') for l in existing}
    
    new_leads = scan_gmail_for_upfirst()
    
    added = 0
    for lead in new_leads:
        phone = lead.get('phone', '').replace('-', '').replace(' ', '')
        if phone not in existing_phones:
            existing.append(lead)
            existing_phones.add(phone)
            added += 1
            log(f"  + New lead: {lead.get('name')} ({lead.get('phone')})")
    
    if added > 0:
        save_leads(existing)
        log(f"Saved {added} new leads (total: {len(existing)})")
    else:
        log("No new leads found")
    
    log("=== Scan Complete ===")

if __name__ == '__main__':
    main()
