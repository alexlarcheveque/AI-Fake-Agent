import { UserSettings } from '../../types/userSettings';

interface AgentSettingsProps {
  userSettings: UserSettings;
  onChange: (settings: Partial<UserSettings>) => void;
  isLoading?: boolean;
}

const AgentSettings: React.FC<AgentSettingsProps> = ({
  userSettings,
  onChange,
  isLoading,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          AI Assistant Settings
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Configure how the AI assistant behaves when communicating with leads.
        </p>
      </div>

      {/* General Agent Prompt */}
      <div>
        <label htmlFor="agentPrompt" className="block text-sm font-medium text-gray-700">
          General Agent Prompt
        </label>
        <div className="mt-1">
          <textarea
            id="agentPrompt"
            name="agentPrompt"
            rows={5}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            value={userSettings?.agentPrompt || ''}
            onChange={(e) => onChange({ agentPrompt: e.target.value })}
            disabled={isLoading}
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          System prompt for general AI interactions
        </p>
      </div>

      {/* Buyer Lead Prompt */}
      <div>
        <label htmlFor="buyerLeadPrompt" className="block text-sm font-medium text-gray-700">
          Buyer Lead Prompt
        </label>
        <div className="mt-1">
          <textarea
            id="buyerLeadPrompt"
            name="buyerLeadPrompt"
            rows={5}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            value={userSettings?.buyerLeadPrompt || ''}
            onChange={(e) => onChange({ buyerLeadPrompt: e.target.value })}
            disabled={isLoading}
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          System prompt for buyer lead interactions
        </p>
      </div>

      {/* Seller Lead Prompt */}
      <div>
        <label htmlFor="sellerLeadPrompt" className="block text-sm font-medium text-gray-700">
          Seller Lead Prompt
        </label>
        <div className="mt-1">
          <textarea
            id="sellerLeadPrompt"
            name="sellerLeadPrompt"
            rows={5}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            value={userSettings?.sellerLeadPrompt || ''}
            onChange={(e) => onChange({ sellerLeadPrompt: e.target.value })}
            disabled={isLoading}
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          System prompt for seller lead interactions
        </p>
      </div>

      {/* Follow-up Prompt */}
      <div>
        <label htmlFor="followUpPrompt" className="block text-sm font-medium text-gray-700">
          Follow-up Prompt
        </label>
        <div className="mt-1">
          <textarea
            id="followUpPrompt"
            name="followUpPrompt"
            rows={5}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            value={userSettings?.followUpPrompt || ''}
            onChange={(e) => onChange({ followUpPrompt: e.target.value })}
            disabled={isLoading}
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          System prompt for follow-up messages
        </p>
      </div>

      {/* Follow-up Intervals */}
      // ... existing code ...
    </div>
  );
};

export default AgentSettings; 