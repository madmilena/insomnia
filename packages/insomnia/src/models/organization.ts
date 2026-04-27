import { type Organization, type PersonalPlanType } from 'insomnia-api';

export const LOCAL_ORGANIZATION_ID = 'org_local';
export const SCRATCHPAD_ORGANIZATION_ID = 'org_scratchpad';
export const isLocalOrganizationId = (organizationId: string) => organizationId === LOCAL_ORGANIZATION_ID;
export const isScratchpadOrganizationId = (organizationId: string) => organizationId === SCRATCHPAD_ORGANIZATION_ID;
export const isOfflineOrganizationId = (organizationId: string) =>
  isLocalOrganizationId(organizationId) || isScratchpadOrganizationId(organizationId);
export const getLocalOrganization = (accountId = ''): Organization => ({
  id: LOCAL_ORGANIZATION_ID,
  name: 'local',
  display_name: 'Local Vault',
  metadata: {
    organizationType: 'personal',
    ownerAccountId: accountId,
  },
});
export const isPersonalOrganization = (organization: Organization) =>
  organization.metadata.organizationType === 'personal';

export const isOwnerOfOrganization = ({ organization, accountId }: { organization: Organization; accountId: string }) =>
  organization.metadata.ownerAccountId === accountId;

export const findPersonalOrganization = (organizations: Organization[], accountId: string) => {
  return organizations.filter(isPersonalOrganization).find(organization =>
    isOwnerOfOrganization({
      organization,
      accountId,
    }),
  );
};

export const formatCurrentPlanType = (type: PersonalPlanType) => {
  switch (type) {
    case 'free': {
      return 'Essentials';
    }
    case 'individual': {
      return 'Individual';
    }
    case 'team': {
      return 'Pro';
    }
    case 'enterprise': {
      return 'Enterprise';
    }
    case 'enterprise-member': {
      return 'Enterprise';
    }
    default: {
      return 'Free';
    }
  }
};
