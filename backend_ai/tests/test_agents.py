"""
Test Agents
"""

from agents import AgentManager, BaseAgent


class DummyAgent(BaseAgent):
    def __init__(self, name="dummy"):
        super().__init__(name)
    
    def run(self, context):
        context["dummy"] = True
        return context


def test_agent_manager():
    """Kiểm tra AgentManager."""
    manager = AgentManager()
    agent = DummyAgent("test")
    manager.register(agent)
    context = {"test": 1}
    result = manager.run(context)
    assert result["dummy"] is True