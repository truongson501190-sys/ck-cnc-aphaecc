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
      machines: [
        { id: '1', name: 'CNC-001', type: 'CNC' },
        { id: '2', name: 'CNC-002', type: 'CNC' },
        { id: '3', name: 'MILL-001', type: 'Milling' },
        { id: '4', name: 'LATHE-001', type: 'Lathe' }
      ],
      tools: [
        { id: '1', name: 'Dao phay', unit: 'cái' },
        { id: '2', name: 'Dao tiện', unit: 'cái' },
        { id: '3', name: 'Mũi khoan', unit: 'cái' },
        { id: '4', name: 'Dao cắt', unit: 'cái' }
      ],
      operators: [
        'Nguyễn Văn A',
        'Trần Văn B', 
        'Lê Văn C',
        'Phạm Văn D'
      ],
      inspectors: [
        'Nguyễn Thị X',
        'Trần Thị Y',
        'Lê Thị Z'
      ],
      projects: [
        { code: 'AL-001', name: 'Dự án A', customer: 'Công ty ABC' },
        { code: 'AL-002', name: 'Dự án B', customer: 'Công ty XYZ' },
        { code: 'AL-003', name: 'Dự án C', customer: 'Công ty DEF' }
      ]
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