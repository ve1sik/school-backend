import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { GroupService } from './group.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Permissions } from '../auth/permissions.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Permissions('MANAGE_GROUPS')
  @Post()
  create(@Body() createGroupDto: any) {
    return this.groupService.create(createGroupDto);
  }

  @Permissions('MANAGE_GROUPS', 'MANAGE_USERS')
  @Get()
  findAll(@Request() req) {
    return this.groupService.findAll(req.user.sub, req.user.role, req.user.admin_permissions || []);
  }

  @Roles('ADMIN', 'CURATOR', 'STUDENT', 'TEACHER')
  @Get('shop')
  findShopGroups() {
    return this.groupService.findShopGroups();
  }

  @Roles('STUDENT', 'ADMIN', 'CURATOR')
  @Get('my-applications')
  getMyApplications(@Request() req) {
    const userId = req.user.sub || req.user.id;
    return this.groupService.getMyApplications(userId);
  }

  @Roles('ADMIN', 'CURATOR', 'TEACHER', 'STUDENT')
  @Get('my-theme-access')
  getMyThemeAccess(@Request() req) {
    const userId = req.user.sub || req.user.id || req.user.userId;
    return this.groupService.getMyThemeAccess(userId);
  }

  @Permissions('CURATOR_DASHBOARD')
  @Get('curator-scope')
  getCuratorScope(@Request() req) {
    return this.groupService.getCuratorScope(req.user.sub, req.user.role);
  }

  @Permissions('MANAGE_GROUPS', 'MANAGE_USERS')
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.groupService.findOne(id, req.user.sub, req.user.role, req.user.admin_permissions || []);
  }

  @Permissions('MANAGE_GROUPS')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGroupDto: any, @Request() req) {
    return this.groupService.update(id, updateGroupDto, req.user.sub, req.user.role, req.user.admin_permissions || []);
  }

  @Permissions('MANAGE_GROUPS')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groupService.remove(id);
  }

  @Permissions('MANAGE_GROUPS')
  @Post(':id/courses')
  updateCourses(@Param('id') id: string, @Body() body: { courseIds: string[] }) {
    return this.groupService.updateCourses(id, body.courseIds);
  }

  @Permissions('MANAGE_GROUPS', 'MANAGE_USERS')
  @Post(':id/students')
  updateStudents(@Param('id') id: string, @Body() body: { studentIds?: string[]; userId?: string }, @Request() req) {
    if (body.userId) {
      return this.groupService.enrollStudent(id, body.userId, req.user.sub, req.user.role);
    }
    return this.groupService.updateStudents(id, body.studentIds || [], req.user.sub, req.user.role);
  }

  @Roles('STUDENT', 'ADMIN', 'CURATOR')
  @Post(':id/apply')
  applyForGroup(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { comment?: string; proof_image?: string },
  ) {
    const userId = req.user.sub || req.user.id;
    return this.groupService.applyForGroup(id, userId, body);
  }

  @Roles('ADMIN', 'CURATOR')
  @Get(':id/applications')
  getApplications(@Param('id') id: string, @Request() req) {
    return this.groupService.getApplications(id, req.user.sub, req.user.role);
  }

  @Roles('ADMIN', 'CURATOR')
  @Patch('applications/:appId/approve')
  approveApplication(@Param('appId') appId: string, @Request() req) {
    const reviewerId = req.user.sub || req.user.id;
    return this.groupService.approveApplication(appId, reviewerId, req.user.role);
  }

  @Roles('ADMIN', 'CURATOR')
  @Patch('applications/:appId/reject')
  rejectApplication(@Param('appId') appId: string, @Request() req) {
    const reviewerId = req.user.sub || req.user.id;
    return this.groupService.rejectApplication(appId, reviewerId, req.user.role);
  }

  @Permissions('MANAGE_GROUPS', 'MANAGE_USERS')
  @Delete(':id/students/:userId')
  removeStudent(@Param('id') id: string, @Param('userId') userId: string, @Request() req) {
    return this.groupService.removeStudent(id, userId, req.user.sub, req.user.role);
  }

  @Permissions('MANAGE_COURSES', 'MANAGE_GROUPS')
  @Get(':id/theme-access')
  getThemeAccess(@Param('id') id: string) {
    return this.groupService.getThemeAccess(id);
  }

  @Permissions('MANAGE_COURSES', 'MANAGE_GROUPS')
  @Post(':id/theme-access')
  upsertThemeAccess(
    @Param('id') id: string,
    @Body() body: { themeId: string; unlock_date?: string | null; deadline?: string | null; is_visible?: boolean },
  ) {
    const { themeId, ...data } = body;
    return this.groupService.upsertThemeAccess(id, themeId, data);
  }
}