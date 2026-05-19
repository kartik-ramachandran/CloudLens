using Microsoft.AspNetCore.Mvc;
using CloudLens.API.Models;
using CloudLens.API.Services;

namespace CloudLens.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RemediationController : ControllerBase
{
    private readonly IRemediationService _service;

    public RemediationController(IRemediationService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? subscriptionId)
        => Ok(await _service.GetAllAsync(subscriptionId));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RemediationItemDto dto)
        => Ok(await _service.CreateAsync(dto));

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] RemediationItemDto dto)
    {
        var result = await _service.UpdateAsync(id, dto);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
        => await _service.DeleteAsync(id) ? Ok() : NotFound();

    [HttpPost("{id}/jira-ticket")]
    public async Task<IActionResult> CreateJiraTicket(int id)
    {
        var result = await _service.CreateJiraTicketAsync(id);
        return result == null ? NotFound() : Ok(result);
    }
}
