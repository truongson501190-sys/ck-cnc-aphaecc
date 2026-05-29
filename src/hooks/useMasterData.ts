import { useState, useEffect } from 'react';

interface Machine {
  id: string;
  name: string;
  type: string;
}

interface Tool {
  id: string;
  name: string;
  unit: string;
}

interface Project {
  code: string;
  name: string;
  customer: string;
}

interface MasterData {
  machines: Machine[];
  tools: Tool[];
  operators: string[];
  inspectors: string[];
  projects: Project[];
}

export const useMasterData = () => {
  const [masterData, setMasterData] = useState<MasterData>({
    machines: [],
    tools: [],
    operators: [],
    inspectors: [],
    projects: []
  });

  useEffect(() => {
    // Initialize default master data
    const defaultMasterData: MasterData = {
      machines: [],
      tools: [],
      operators: [],
      inspectors: [],
      projects: [],
    };

    // Load from localStorage or use defaults
    const savedData = localStorage.getItem('masterData');
    if (savedData) {
      try {
        setMasterData(JSON.parse(savedData));
      } catch {
        setMasterData(defaultMasterData);
        localStorage.setItem('masterData', JSON.stringify(defaultMasterData));
      }
    } else {
      setMasterData(defaultMasterData);
      localStorage.setItem('masterData', JSON.stringify(defaultMasterData));
    }
  }, []);

  const getMachineByName = (name: string) => {
    return masterData.machines.find(machine => machine.name === name);
  };

  const getToolByName = (name: string) => {
    return masterData.tools.find(tool => tool.name === name);
  };

  const getProjectByCode = (code: string) => {
    const projectCode = code.startsWith('AL-') ? code : `AL-${code}`;
    return masterData.projects.find(project => project.code === projectCode);
  };

  return {
    masterData,
    getMachineByName,
    getToolByName,
    getProjectByCode
  };
};