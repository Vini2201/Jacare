from abc import ABC, abstractmethod

class PDFRenderer(ABC):
    """
    Interface comum para todos os renderizadores de PDF (WeasyPrint, CloudConvert, etc.).
    Garante que a aplicação cliente não precise conhecer as implementações específicas.
    """

    @abstractmethod
    async def render(self, html_content: str, output_path: str, **kwargs) -> str:
        """
        Recebe o conteúdo HTML gerado pelo TemplateEngine e o caminho de destino.
        Deve retornar o caminho absoluto do PDF gerado.
        """
        pass
